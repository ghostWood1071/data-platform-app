import { spawn } from "child_process";
import path from "path";
import { logger } from "../lib/logger";
import { db, sparkClusterOperations } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  SparkReleaseName,
  SparkClusterSize,
  SparkClusterAction,
  SparkClusterOperationDto,
} from "@workspace/api-zod";

export class SparkClusterService {
  private scriptDir: string;
  private appRoot: string;

  constructor() {
    this.appRoot = process.env.APP_ROOT || process.cwd();
    this.scriptDir =
      process.env.SPARK_SCRIPT_DIR || path.resolve(this.appRoot, "scripts");
  }

  async createOperation(params: {
    action: SparkClusterAction;
    releaseName: SparkReleaseName;
    size?: SparkClusterSize;
    replicas?: number;
    requestedBy?: string;
  }) {
    const [op] = await db
      .insert(sparkClusterOperations)
      .values({
        action: params.action,
        releaseName: params.releaseName,
        size: params.size,
        replicas: params.replicas,
        status: "PENDING",
        requestedBy: params.requestedBy,
      })
      .returning();

    logger.info(
      {
        operationId: op.id,
        action: params.action,
        releaseName: params.releaseName,
        size: params.size,
        replicas: params.replicas,
      },
      "Spark cluster operation created",
    );

    // Execute async in background
    void this.executeOperation(op.id);

    return op;
  }

  async getOperation(id: string): Promise<SparkClusterOperationDto | null> {
    const [op] = await db
      .select()
      .from(sparkClusterOperations)
      .where(eq(sparkClusterOperations.id, id));
    if (!op) return null;
    return this.mapToDto(op);
  }

  async getOperationsByRelease(
    releaseName: SparkReleaseName,
  ): Promise<SparkClusterOperationDto[]> {
    const ops = await db
      .select()
      .from(sparkClusterOperations)
      .where(eq(sparkClusterOperations.releaseName, releaseName))
      .orderBy(desc(sparkClusterOperations.createdAt))
      .limit(50);
    return ops.map((op) => this.mapToDto(op));
  }

  private mapToDto(op: any): SparkClusterOperationDto {
    return {
      id: op.id,
      action: op.action as any,
      releaseName: op.releaseName as any,
      size: op.size as any,
      replicas: op.replicas,
      status: op.status as any,
      stdout: op.stdout,
      stderr: op.stderr,
      errorMessage: op.errorMessage,
      requestedBy: op.requestedBy,
      createdAt: op.createdAt.toISOString(),
      startedAt: op.startedAt ? op.startedAt.toISOString() : null,
      finishedAt: op.finishedAt ? op.finishedAt.toISOString() : null,
    };
  }

  private async executeOperation(operationId: string) {
    const [op] = await db
      .select()
      .from(sparkClusterOperations)
      .where(eq(sparkClusterOperations.id, operationId));
    if (!op) return;

    await db
      .update(sparkClusterOperations)
      .set({ status: "RUNNING", startedAt: new Date() })
      .where(eq(sparkClusterOperations.id, operationId));

    logger.info({ operationId, action: op.action }, "Spark cluster operation started");

    let scriptPath = "";
    let args: string[] = [];

    switch (op.action) {
      case "START":
        scriptPath = path.join(this.scriptDir, "03-cluster-up.sh");
        args = [op.size!, op.releaseName];
        break;
      case "STOP":
        scriptPath = path.join(this.scriptDir, "04-cluster-down.sh");
        args = [op.releaseName];
        break;
      case "RESIZE":
        scriptPath = path.join(this.scriptDir, "05-cluster-resize.sh");
        args = [op.releaseName, op.replicas!.toString()];
        break;
    }

    logger.info(
      { operationId, scriptPath, args },
      "Starting Spark cluster operation script",
    );

    try {
      const result = await this.runScript(scriptPath, args);
      await db
        .update(sparkClusterOperations)
        .set({
          status: result.exitCode === 0 ? "SUCCESS" : "FAILED",
          stdout: result.stdout,
          stderr: result.stderr,
          finishedAt: new Date(),
          errorMessage:
            result.exitCode === 0
              ? null
              : `Script exited with code ${result.exitCode}`,
        })
        .where(eq(sparkClusterOperations.id, operationId));

      logger.info(
        { operationId, exitCode: result.exitCode },
        result.exitCode === 0
          ? "Spark cluster operation succeeded"
          : "Spark cluster operation failed",
      );
    } catch (error: any) {
      logger.error(
        { operationId, error },
        "Spark cluster operation script failed with error",
      );
      await db
        .update(sparkClusterOperations)
        .set({
          status: "FAILED",
          errorMessage: error.message || "Unknown error occurred",
          stdout: error.stdout,
          stderr: error.stderr,
          finishedAt: new Date(),
        })
        .where(eq(sparkClusterOperations.id, operationId));
    }
  }

  private runScript(
    scriptPath: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn(scriptPath, args, {
        cwd: this.appRoot,
        shell: false,
        env: { ...process.env, APPLY_NAMESPACE: "false" },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill();
        const error = new Error("Script execution timed out after 10 minutes") as Error & {
          stdout?: string;
          stderr?: string;
        };
        error.stdout = stdout;
        error.stderr = stderr;
        logger.error({ scriptPath, args }, "Spark cluster operation timed out");
        reject(error);
      }, 10 * 60 * 1000);

      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        const error = err as Error & { stdout?: string; stderr?: string };
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      });
    });
  }
}

export const sparkClusterService = new SparkClusterService();
