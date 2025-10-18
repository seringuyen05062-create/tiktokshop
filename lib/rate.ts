/**
 * Rate limiting and auto-throttling for scraper
 */

export interface RateLimiter {
  shouldDelay(): boolean;
  getDelay(): number;
  recordSuccess(): void;
  recordError(errorType: 'captcha' | '4xx' | '5xx' | 'timeout'): void;
  reset(): void;
}

export class AdaptiveRateLimiter implements RateLimiter {
  private successCount = 0;
  private errorCount = 0;
  private captchaCount = 0;
  private baseDelay = 1000; // 1 second
  private maxDelay = 10000; // 10 seconds
  private currentDelay = this.baseDelay;
  
  private readonly windowMs = 60000; // 1 minute window
  private errors: Array<{ timestamp: number; type: string }> = [];

  shouldDelay(): boolean {
    this.cleanOldErrors();
    return this.errors.length > 0 || this.captchaCount > 0;
  }

  getDelay(): number {
    this.cleanOldErrors();
    
    // Base delay
    let delay = this.currentDelay;
    
    // Increase delay based on recent errors
    const recentErrors = this.errors.length;
    if (recentErrors > 0) {
      delay *= Math.min(recentErrors * 0.5 + 1, 5); // Max 5x multiplier
    }
    
    // Extra delay for captcha
    if (this.captchaCount > 0) {
      delay *= 2;
    }
    
    // Random jitter to avoid detection
    const jitter = Math.random() * 0.3 + 0.85; // 0.85 to 1.15
    delay *= jitter;
    
    return Math.min(delay, this.maxDelay);
  }

  recordSuccess(): void {
    this.successCount++;
    
    // Gradually reduce delay on success
    if (this.successCount % 5 === 0) {
      this.currentDelay = Math.max(
        this.currentDelay * 0.9,
        this.baseDelay
      );
    }
    
    // Reset captcha count after successful requests
    if (this.successCount % 3 === 0) {
      this.captchaCount = Math.max(0, this.captchaCount - 1);
    }
  }

  recordError(errorType: 'captcha' | '4xx' | '5xx' | 'timeout'): void {
    this.errorCount++;
    
    const now = Date.now();
    this.errors.push({ timestamp: now, type: errorType });
    
    // Special handling for different error types
    switch (errorType) {
      case 'captcha':
        this.captchaCount++;
        this.currentDelay = Math.min(this.currentDelay * 1.5, this.maxDelay);
        break;
      case '4xx':
        this.currentDelay = Math.min(this.currentDelay * 1.3, this.maxDelay);
        break;
      case '5xx':
        this.currentDelay = Math.min(this.currentDelay * 1.2, this.maxDelay);
        break;
      case 'timeout':
        this.currentDelay = Math.min(this.currentDelay * 1.1, this.maxDelay);
        break;
    }
  }

  reset(): void {
    this.successCount = 0;
    this.errorCount = 0;
    this.captchaCount = 0;
    this.currentDelay = this.baseDelay;
    this.errors = [];
  }

  private cleanOldErrors(): void {
    const cutoff = Date.now() - this.windowMs;
    this.errors = this.errors.filter(error => error.timestamp > cutoff);
  }

  getStats() {
    return {
      successCount: this.successCount,
      errorCount: this.errorCount,
      captchaCount: this.captchaCount,
      currentDelay: this.currentDelay,
      recentErrors: this.errors.length,
    };
  }
}

// Global rate limiter instance
export const globalRateLimiter = new AdaptiveRateLimiter();