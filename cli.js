#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { spawn } = require('child_process');

const command = process.argv.slice(2).join(' ');

spawn('create-micro-qk', [command], { stdio: 'inherit' });

program
  .command('init <name>')
  .description('Create a new project')
  .action((name) => {
    const projectDir = path.resolve(process.cwd(), name);

    if (fs.existsSync(projectDir)) {
      console.error(`Directory "${name}" already exists!`);
      process.exit(1);
    }

    fs.mkdirSync(projectDir);

    const srcDir = path.resolve(projectDir, 'src');
    const indexFile = path.resolve(srcDir, 'index.js');

    fs.mkdirSync(srcDir);
    fs.writeFileSync(indexFile, '// Start coding here.');

    const packageJson = {
      name,
      version: '0.1.0',
      description: '',
      scripts: {
        start: 'webpack serve --mode development',
        build: 'webpack --mode production',
      },
      devDependencies: {
        webpack: '^5.64.4',
        'webpack-cli': '^4.9.1',
        'webpack-dev-server': '^4.7.2',
        'babel-loader': '^8.2.3',
        '@babel/core': '^7.16.12',
        '@babel/preset-env': '^7.16.11',
      },
    };

    fs.writeFileSync(
      path.resolve(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    fs.copyFileSync(
      path.resolve(__dirname, 'webpack.config.js'),
      path.resolve(projectDir, 'webpack.config.js'),
    );

    console.log(`Project "${name}" created!`);
    console.log(`To get started, run:\n`);
    console.log(`  cd ${name}`);
    console.log(`  npm install`);
    console.log(`  npm start`);
  });

program.parse(process.argv);
