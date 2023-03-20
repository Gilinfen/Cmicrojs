# Cmicrojs

![cmicrojs](https://picgo-any.oss-cn-shanghai.aliyuncs.com/img/202303191448931.png)

## 用法

适用于 node.js 环境下，快速构建项目模版脚手架插件

```ts
import cmicrojs from 'cmicrojs'

const init = async () => {
  await cmicrojs([
    {
      name: 'react',
      display: 'React',
      color: 'cyan',
    },
    {
      name: 'vue',
      display: 'Vue',
      color: 'green',
      variants: [
        {
          name: 'vue',
          display: 'JavaScript',
          color: 'yellow'
        },
        {
          name: 'vue-ts',
          display: 'TypeScript',
          color: 'blue'
        }
      ]
    }
  ])
}

init()
```

模版目录结构

```sh
.
├── template-react
│   └── index.js
│   ├── package.json
├── template-vue
│   ├── README.md
│   ├── _gitignore
│   ├── index.html
│   ├── package.json
│   ├── public
│   │   └── vite.svg
│   ├── src
│   │   ├── App.vue
│   │   ├── assets
│   │   │   └── vue.svg
│   │   ├── components
│   │   │   └── HelloWorld.vue
│   │   ├── main.js
│   │   └── style.css
│   └── vite.config.js
└── template-vue-ts
    ├── README.md
    ...
```
