// vscode-extension/src/problemContext.ts

export interface ProblemContext {
  title: string | null;
  constraints: string | null;
  examples: string[];
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | null;
  source: 'leetcode' | 'codeforces' | 'other' | null;
  timeComplexityExpected: string | null;
  spaceComplexityExpected: string | null;
  pastTime: number; // timestamp when pasted
}

export class ProblemContextManager {
  private context: ProblemContext | null = null;

  /**
   * Parse raw problem text and extract structured data
   */
  parseProblemText(text: string): ProblemContext {
    const ctx: ProblemContext = {
      title: this.extractTitle(text),
      constraints: this.extractConstraints(text),
      examples: this.extractExamples(text),
      tags: this.extractTags(text),
      difficulty: this.extractDifficulty(text),
      source: this.detectSource(text),
      timeComplexityExpected: this.extractComplexity(text, 'time'),
      spaceComplexityExpected: this.extractComplexity(text, 'space'),
      pastTime: Date.now(),
    };

    this.context = ctx;
    return ctx;
  }

  /**
   * Extract problem title
   */
  private extractTitle(text: string): string | null {
    // Common patterns: "1. Two Sum" or "Two Sum" or "Problem: Two Sum"
    const match = text.match(
      /(?:Problem|#|^|\n)\s*(?:\d+\.\s+)?([A-Za-z].*?)(?:\n|$|Given|Description|Constraints)/i
    );
    return match ? match[1].trim() : null;
  }

  /**
   * Extract constraints section
   */
  private extractConstraints(text: string): string | null {
    const match = text.match(
      /Constraints?:?\s*\n([\s\S]*?)(?:\n\n|Examples?:|Input|Output|$)/i
    );
    if (match) {
      return match[1]
        .split('\n')
        .filter((line) => line.trim())
        .join('\n');
    }
    return null;
  }

  /**
   * Extract examples
   */
  private extractExamples(text: string): string[] {
    const examples: string[] = [];
    const exampleMatches = text.matchAll(
      /Example\s*\d*:?\s*\n([\s\S]*?)(?=\n\nExample|\nConstraints|$)/gi
    );

    for (const match of exampleMatches) {
      examples.push(match[1].trim());
    }

    return examples;
  }

  /**
   * Extract tags/topics (binary search, DP, graph, etc.)
   */
  private extractTags(text: string): string[] {
    const tagsKeywords = [
      'binary search',
      'dynamic programming',
      'dp',
      'graph',
      'tree',
      'recursion',
      'backtracking',
      'greedy',
      'sorting',
      'hash map',
      'hash table',
      'string',
      'array',
      'linked list',
      'stack',
      'queue',
      'heap',
      'trie',
      'union find',
      'bfs',
      'dfs',
      'sliding window',
      'two pointer',
      'divide and conquer',
      'bit manipulation',
    ];

    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of tagsKeywords) {
      if (lowerText.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Extract difficulty level
   */
  private extractDifficulty(
    text: string
  ): 'easy' | 'medium' | 'hard' | null {
    if (/difficulty\s*[:=]\s*(?:easy|1)/i.test(text)) return 'easy';
    if (/difficulty\s*[:=]\s*(?:medium|2)/i.test(text)) return 'medium';
    if (/difficulty\s*[:=]\s*(?:hard|3)/i.test(text)) return 'hard';

    if (/\b(?:easy)\b/i.test(text)) return 'easy';
    if (/\b(?:medium)\b/i.test(text)) return 'medium';
    if (/\b(?:hard)\b/i.test(text)) return 'hard';

    return null;
  }

  /**
   * Detect source platform
   */
  private detectSource(text: string): 'leetcode' | 'codeforces' | 'other' | null {
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('leetcode') ||
      /^\d+\./.test(text) // LeetCode format: "1. Two Sum"
    ) {
      return 'leetcode';
    }
    if (lowerText.includes('codeforces')) {
      return 'codeforces';
    }
    return null;
  }

  /**
   * Extract time or space complexity expectation
   */
  private extractComplexity(text: string, type: 'time' | 'space'): string | null {
    const pattern =
      type === 'time'
        ? /time\s*complexity\s*[:=]?\s*([^\n,]*)/i
        : /space\s*complexity\s*[:=]?\s*([^\n,]*)/i;

    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Get current problem context
   */
  getCurrentContext(): ProblemContext | null {
    return this.context;
  }

  /**
   * Reset problem context
   */
  reset(): void {
    this.context = null;
  }

  /**
   * Check if context is stale (> 30 minutes old)
   */
  isStale(): boolean {
    if (!this.context) return true;
    const age = Date.now() - this.context.pastTime;
    return age > 30 * 60 * 1000;
  }
}