/**
 * Worker Manager for Text Processing
 * This utility manages web workers for text processing operations
 */

// Import types
import { Article } from '@/lib/types';

// Worker pool configuration
const MAX_WORKERS = navigator.hardwareConcurrency || 4;
const IDLE_TIMEOUT = 30000; // 30 seconds

interface WorkerTask {
  id: string;
  text: string;
  operation: 'parse' | 'extract' | 'analyze';
  options?: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  lastUsed: number;
}

class TextWorkerManager {
  private workers: WorkerInfo[] = [];
  private taskQueue: WorkerTask[] = [];
  private idleTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    // Create initial workers based on configuration
    this.createInitialWorkers();
    
    // Set up idle worker cleanup
    this.setupIdleCleanup();
  }
  
  /**
   * Process text using worker threads
   */
  public async processText(
    text: string, 
    operation: 'parse' | 'extract' | 'analyze' = 'parse', 
    options: any = {}
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        operation,
        options,
        resolve,
        reject
      };
      
      // Try to get an available worker
      const availableWorker = this.getAvailableWorker();
      
      if (availableWorker) {
        this.assignTaskToWorker(task, availableWorker);
      } else {
        // No workers available, queue the task
        this.taskQueue.push(task);
        
        // If we can create more workers, do so
        if (this.workers.length < MAX_WORKERS) {
          this.createWorker();
        }
      }
    });
  }
  
  /**
   * Create initial worker pool
   */
  private createInitialWorkers(): void {
    // Start with 2 workers
    const initialCount = Math.min(2, MAX_WORKERS);
    for (let i = 0; i < initialCount; i++) {
      this.createWorker();
    }
  }
  
  /**
   * Create a new worker
   */
  private createWorker(): WorkerInfo {
    // Create new worker
    const worker = new Worker(new URL('../workers/textParser.worker.ts', import.meta.url), { type: 'module' });
    
    // Set up message handling
    worker.addEventListener('message', this.handleWorkerMessage.bind(this, worker));
    
    // Add to pool
    const workerInfo: WorkerInfo = {
      worker,
      busy: false,
      lastUsed: Date.now()
    };
    
    this.workers.push(workerInfo);
    console.log(`Created worker #${this.workers.length}`);
    
    // Check if there are pending tasks to assign
    this.assignPendingTaskIfAvailable(workerInfo);
    
    return workerInfo;
  }
  
  /**
   * Get an available worker
   */
  private getAvailableWorker(): WorkerInfo | null {
    return this.workers.find(w => !w.busy) || null;
  }
  
  /**
   * Handle message from worker
   */
  private handleWorkerMessage(worker: Worker, event: MessageEvent): void {
    // Find the worker info
    const workerInfo = this.workers.find(w => w.worker === worker);
    if (!workerInfo) return;
    
    // Update worker status
    workerInfo.busy = false;
    workerInfo.lastUsed = Date.now();
    
    // Find the task that was being processed
    // In a real implementation, you would include a task ID in the response
    // For this example, we assume workers process one task at a time
    
    // Check if there are more tasks in the queue
    this.assignPendingTaskIfAvailable(workerInfo);
  }
  
  /**
   * Assign task to worker
   */
  private assignTaskToWorker(task: WorkerTask, workerInfo: WorkerInfo): void {
    // Mark worker as busy
    workerInfo.busy = true;
    workerInfo.lastUsed = Date.now();
    
    // Send task to worker
    workerInfo.worker.postMessage({
      text: task.text,
      operation: task.operation,
      options: task.options
    });
    
    // Set up message handling for this specific task
    const messageHandler = (event: MessageEvent) => {
      if (event.data.error) {
        task.reject(new Error(event.data.error));
      } else {
        task.resolve(event.data);
      }
      
      // Remove this specific message handler
      workerInfo.worker.removeEventListener('message', messageHandler);
    };
    
    workerInfo.worker.addEventListener('message', messageHandler);
  }
  
  /**
   * Assign pending task if available
   */
  private assignPendingTaskIfAvailable(workerInfo: WorkerInfo): void {
    if (this.taskQueue.length > 0 && !workerInfo.busy) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        this.assignTaskToWorker(nextTask, workerInfo);
      }
    }
  }
  
  /**
   * Set up idle cleanup
   */
  private setupIdleCleanup(): void {
    this.idleTimer = setInterval(() => {
      const now = Date.now();
      
      // Keep at least one worker
      if (this.workers.length > 1) {
        // Find idle workers
        const idleWorkers = this.workers.filter(
          w => !w.busy && (now - w.lastUsed) > IDLE_TIMEOUT
        );
        
        // Terminate idle workers (keeping at least one)
        idleWorkers.slice(0, this.workers.length - 1).forEach(workerInfo => {
          const index = this.workers.indexOf(workerInfo);
          if (index !== -1) {
            workerInfo.worker.terminate();
            this.workers.splice(index, 1);
            console.log(`Terminated idle worker, ${this.workers.length} remaining`);
          }
        });
      }
    }, IDLE_TIMEOUT);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clear idle timer
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    
    // Terminate all workers
    this.workers.forEach(workerInfo => {
      workerInfo.worker.terminate();
    });
    
    this.workers = [];
    
    // Reject any pending tasks
    this.taskQueue.forEach(task => {
      task.reject(new Error('Worker manager disposed'));
    });
    
    this.taskQueue = [];
  }
}

// Export singleton instance
const workerManager = new TextWorkerManager();
export default workerManager; 