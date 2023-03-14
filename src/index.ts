#!/usr/bin/env node
import path from 'path';
import { copy } from 'fs-extra';
import { program } from 'commander';

const templateDir = path.join(path.dirname("../template"));

program
  .arguments('<project-name>')
  .description('Create a new project')
  .action(async (projectName) => {
    try {
      const destDir = path.join(process.cwd(), projectName);
      await copy(templateDir, destDir);
      console.log(`Project "${projectName}" created successfully!`);
    } catch (err) {
      console.error('Error creating project:', err);
    }
  });

program.parse(process.argv);
