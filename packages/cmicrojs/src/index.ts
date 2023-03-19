import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import minimist from 'minimist'
import prompts from 'prompts'
import * as kolorist from 'kolorist'

type Color = keyof typeof kolorist

type initVariants = Pick<
  FrameworkVariant,
  Exclude<keyof FrameworkVariant, 'color'>
> & {
  color: Color
}

type InitValie = Pick<
  Framework,
  Exclude<keyof Framework, 'color' | 'variants'>
> & {
  color: Color
  variants: initVariants[]
}

type ColorFunc = (str: string | number) => string

type FrameworkVariant = {
  name: string
  display: string
  color: ColorFunc
  customCommand?: string
}

type Framework = {
  name: string
  display: string
  color: ColorFunc
  variants: FrameworkVariant[]
}

const { reset, red } = kolorist

//通过定义参数避免自动转换为项目名称的数字
//与选项(_)没有关联需要被解析为字符串。看到# 4606
const argv = minimist<{
  t?: string
  template?: string
}>(process.argv.slice(2), { string: ['_'] })
const cwd = process.cwd()

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore'
}

const defaultTargetDir = 'my-project'

function repValue(params: any): Framework[] {
  return params.reduce((pre: any, item: any) => {
    const obj = {
      ...item,
      color: kolorist[item.color as Color]
    }
    if (item.variants) {
      obj.variants = repValue(item.variants)
    }
    return [...pre, obj]
  }, [])
}

export default async function init<T extends string>(
  values: InitValie[],
  promptsFun?: () => Promise<prompts.Answers<T>>
) {
  const FRAMEWORKS: Framework[] = repValue(values)

  const TEMPLATES = FRAMEWORKS.map(
    f => (f.variants && f.variants.map(v => v.name)) || [f.name]
  ).reduce((a, b) => a.concat(b), [])

  const argTargetDir = formatTargetDir(argv._[0])
  const argTemplate = argv.template || argv.t

  let targetDir = argTargetDir || defaultTargetDir

  const getProjectName = () =>
    targetDir === '.' ? path.basename(path.resolve()) : targetDir

  let result: prompts.Answers<
    'projectName' | 'framework' | 'variant' | 'packageName' | 'overwrite'
  >

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : 'text',
          name: 'projectName',
          message: reset('Project name:'),
          initial: defaultTargetDir,
          onState: state => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir
          }
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'confirm',
          name: 'overwrite',
          message: () =>
            (targetDir === '.'
              ? 'Current directory'
              : `Target directory "${targetDir}"`) +
            ` is not empty. Remove existing files and continue?`
        },
        {
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: reset('Package name:'),
          initial: () => toValidPackageName(getProjectName()),
          validate: dir =>
            isValidPackageName(dir) || 'Invalid package.json name'
        },
        {
          type:
            argTemplate && TEMPLATES.includes(argTemplate) ? null : 'select',
          name: 'framework',
          message:
            typeof argTemplate === 'string' && !TEMPLATES.includes(argTemplate)
              ? reset(
                  `"${argTemplate}" isn't a valid template. Please choose from below: `
                )
              : reset('Select a framework:'),
          initial: 0,
          choices: FRAMEWORKS.map(framework => {
            const frameworkColor = framework.color
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework
            }
          })
        },
        {
          type: (framework: Framework) =>
            framework && framework.variants ? 'select' : null,
          name: 'variant',
          message: reset('Select a variant:'),
          choices: (framework: Framework) =>
            framework.variants.map(variant => {
              const variantColor = variant.color
              return {
                title: variantColor(variant.display || variant.name),
                value: variant.name
              }
            })
        }
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' Operation cancelled')
        }
      }
    )
  } catch (cancelled: any) {
    console.log(cancelled.message)
    return
  }

  // 将用户选择的模版来生成根目录位置
  const { framework, overwrite, variant, packageName } = result
  const root = path.join(cwd, targetDir)

  // overwrite 用户是否确认删除已有目录
  if (overwrite) {
    // 当以存在目录则处理
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    // 如果当前目录为空则创建新目录
    fs.mkdirSync(root, { recursive: true })
  }

  // 确定模版 template
  let template: string = variant || framework?.name || argTemplate

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log(`\nScaffolding project in ${root}...`)

  const templateDir = path.resolve(
    // @ts-ignore
    fileURLToPath(import.meta.url),
    '../..',
    `template-${template}`
  )

  // 写入方法
  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  // 读取文件后循环写入
  const files = fs.readdirSync(templateDir)
  for (const file of files.filter(f => f !== 'package.json')) {
    write(file)
  }

  // 写入 package.json
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8')
    )
    pkg.name = packageName || getProjectName()

    write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  } catch (error) {
    console.log(
      '\n' +
        'package.json file not found in the template' +
        ` Stencil position ${templateDir}`
    )
    console.error(error)
    return
  }

  // 最后提示语
  const cdProjectName = path.relative(cwd, root)
  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    console.log(
      `  cd ${
        cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName
      }`
    )
  }
  switch (pkgManager) {
    case 'yarn':
      console.log('  yarn')
      console.log('  yarn dev')
      break
    default:
      console.log(`  ${pkgManager} install`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  console.log()
}

// 格式化命令行参数
function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, '')
}

// 判断是否为空文件
function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

// 删除已有目录并重新创建
function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

// 获取包管理工具信息
function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1]
  }
}

// 判断是否为有效的 package name
function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName
  )
}

// 处理 package name
function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

// copy 文件
function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

// copy 目录文件
function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}
