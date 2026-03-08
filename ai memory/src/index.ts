#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './cli/init.js';
import { syncCommand } from './cli/sync.js';
import { decisionCommand } from './cli/decision.js';
import { askCommand } from './cli/ask.js';

const program = new Command();

program
    .name('ai-memory')
    .description(chalk.cyan('🧠 AI Memory — Structured project memory for AI-assisted development'))
    .version('1.0.0');

program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(decisionCommand);
program.addCommand(askCommand);

program.parse();
