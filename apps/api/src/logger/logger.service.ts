import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService implements OnModuleInit {
    private readonly baseLogDir: string;
    private loggers: Map<string, { stdout: fs.WriteStream; stderr: fs.WriteStream }> = new Map();

    constructor() {
        this.baseLogDir = path.join(process.cwd(), 'logs');
    }

    onModuleInit() {
        if (!fs.existsSync(this.baseLogDir)) {
            fs.mkdirSync(this.baseLogDir, { recursive: true });
        }
    }

    private getLoggerStreams(loggerName: string) {
        if (!this.loggers.has(loggerName)) {
            const loggerDir = path.join(this.baseLogDir, loggerName);
            
            if (!fs.existsSync(loggerDir)) {
                fs.mkdirSync(loggerDir, { recursive: true });
            }

            const stdout = fs.createWriteStream(
                path.join(loggerDir, 'stdout.log'),
                { flags: 'a' }  // Append mode
            );
            const stderr = fs.createWriteStream(
                path.join(loggerDir, 'stderr.log'),
                { flags: 'a' }  // Append mode
            );

            this.loggers.set(loggerName, { stdout, stderr });
        }

        return this.loggers.get(loggerName)!;
    }

    logStdout(loggerName: string, data: Buffer) {
        const { stdout } = this.getLoggerStreams(loggerName);
        const timestamp = new Date().toISOString();
        stdout.write(`[${timestamp}] ${data.toString()}\n`);
    }

    logStderr(loggerName: string, data: Buffer) {
        const { stderr } = this.getLoggerStreams(loggerName);
        const timestamp = new Date().toISOString();
        stderr.write(`[${timestamp}] ${data.toString()}\n`);
    }

    onModuleDestroy() {
        // Close all write streams
        for (const { stdout, stderr } of this.loggers.values()) {
            stdout.end();
            stderr.end();
        }
        this.loggers.clear();
    }
} 