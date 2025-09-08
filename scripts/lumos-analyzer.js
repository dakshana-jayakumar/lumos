#!/usr/bin/env node

/**
 * Lumos - AI-Powered Test Failure Analyzer
 * Reads from Playwright's JSON report and generates AI analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_API_MODEL || 'gemini-2.0-flash-exp';
const MAX_FAILURES = parseInt(process.env.LUMOS_MAX_FAILURES || '10', 10);
const AUTO_OPEN = process.env.LUMOS_AUTO_OPEN === 'true';
const ENABLED = process.env.LUMOS_ENABLED !== 'false';

// Paths
const PLAYWRIGHT_REPORT = path.join(
  process.cwd(),
  'tests/demo/demo-outputs/playwright-report.json'
);
const OUTPUT_DIR = path.join(process.cwd(), 'test-reports/lumos');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'analysis-data.json');
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'latest.html');

/**
 * Parse Playwright JSON report
 */
function parsePlaywrightReport(reportPath) {
  console.log(`📖 Reading Playwright report: ${reportPath}`);

  const content = fs.readFileSync(reportPath, 'utf-8');
  const report = JSON.parse(content);
  const failureMap = new Map(); // Group by unique test

  // Extract failures from report
  for (const suite of report.suites) {
    for (const spec of suite.specs) {
      if (spec.ok) continue; // Skip passing tests

      const file = spec.file || suite.file || 'unknown';
      const testId = `${file}::${spec.title}`;

      for (const test of spec.tests) {
        // Find the LAST failed attempt (most relevant)
        let lastFailedResult = null;
        let lastFailedIndex = -1;

        for (
          let retryIndex = 0;
          retryIndex < test.results.length;
          retryIndex++
        ) {
          const result = test.results[retryIndex];
          if (result.status === 'failed' && result.error) {
            lastFailedResult = result;
            lastFailedIndex = retryIndex;
          }
        }

        // Only add if we found a failure
        if (lastFailedResult) {
          failureMap.set(testId, {
            title: spec.title,
            suite: file.replace(process.cwd() + '/', ''),
            file: lastFailedResult.error.location?.file || file,
            line: lastFailedResult.error.location?.line,
            column: lastFailedResult.error.location?.column,
            error: lastFailedResult.error.message,
            stack: lastFailedResult.error.stack || '',
            status: 'failed',
            duration: lastFailedResult.duration,
            retry: lastFailedIndex,
            totalAttempts: test.results.length,
          });
        }
      }
    }
  }

  return {
    failures: Array.from(failureMap.values()),
    stats: report.stats,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Categorize test failure
 */
function categorizeFailure(error) {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('timeout')) {
    return { category: 'Timeout Error', severity: 'high', icon: '⏱️' };
  }
  if (
    errorLower.includes('visual difference') ||
    errorLower.includes('screenshot')
  ) {
    return { category: 'Visual Regression', severity: 'medium', icon: '👁️' };
  }
  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return { category: 'Network Error', severity: 'high', icon: '🌐' };
  }
  if (errorLower.includes('selector') || errorLower.includes('element')) {
    return { category: 'Element Not Found', severity: 'medium', icon: '🔍' };
  }
  if (errorLower.includes('assertion') || errorLower.includes('expected')) {
    return { category: 'Assertion Failed', severity: 'medium', icon: '❌' };
  }

  return { category: 'General Error', severity: 'medium', icon: '⚠️' };
}

/**
 * Call Gemini API for analysis
 */
async function analyzeWithAI(failure) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set, skipping AI analysis');
    return null;
  }

  const prompt = `You are a Playwright test failure expert. Analyze this test failure and provide actionable insights.

TEST: ${failure.title}
FILE: ${failure.file}
ERROR: ${failure.error}
STACK TRACE:
${failure.stack}

Provide your analysis in this EXACT format:

ROOT CAUSE: [One clear sentence explaining why the test failed]

CONFIDENCE: [A number from 1-100 indicating your confidence in this analysis]

SUGGESTIONS:
1. [First specific, actionable suggestion with code examples if applicable]
2. [Second suggestion]
3. [Third suggestion]
4. [Fourth suggestion - debugging steps]
5. [Fifth suggestion - prevention measures]

Be concise but thorough. Focus on practical fixes.`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse AI response
    const rootCauseMatch = text.match(
      /ROOT CAUSE:\s*(.+?)(?=\n\n|CONFIDENCE:)/s
    );
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/);
    const suggestionsMatch = text.match(/SUGGESTIONS:\s*(.+?)$/s);

    const rootCause = rootCauseMatch?.[1]?.trim() || 'Analysis incomplete';
    const confidence = parseInt(confidenceMatch?.[1] || '50', 10);

    let suggestions = [];
    if (suggestionsMatch) {
      suggestions = suggestionsMatch[1]
        .split(/\n\d+\.\s+/)
        .filter((s) => s.trim())
        .map((s) => s.trim());
    }

    return {
      rootCause,
      confidence,
      suggestions,
      rawOutput: text,
    };
  } catch (error) {
    console.error(
      `❌ AI analysis failed for "${failure.title}":`,
      error.message
    );
    return null;
  }
}

/**
 * Generate HTML report
 */
function generateHTMLReport(data) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumos Test Analysis Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 1.1em; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px 40px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .failures { padding: 40px; }
        .failure-card {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .failure-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f8f9fa;
        }
        .failure-icon { font-size: 2em; }
        .failure-title { flex: 1; }
        .failure-title h2 { color: #212529; margin-bottom: 5px; }
        .failure-meta { color: #6c757d; font-size: 0.9em; }
        .category-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            background: #667eea;
            color: white;
        }
        .error-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .analysis-section {
            background: #e7f3ff;
            border-left: 4px solid #0066cc;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .analysis-section h3 {
            color: #0066cc;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .confidence-bar {
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .confidence-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
            transition: width 1s ease;
        }
        .suggestions { margin-top: 15px; }
        .suggestion {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border-left: 3px solid #28a745;
        }
        .stack-trace {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            max-height: 200px;
            overflow-y: auto;
        }
        .expandable { cursor: pointer; user-select: none; }
        .expandable:hover { opacity: 0.8; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔮 Lumos Test Analysis</h1>
            <p class="subtitle">AI-Powered Playwright Test Failure Insights</p>
        </header>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${data.failures.length}</div>
                <div class="stat-label">Total Failures</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.stats.expected || 0}</div>
                <div class="stat-label">Tests Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.stats.skipped || 0}</div>
                <div class="stat-label">Tests Skipped</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${new Date(data.timestamp).toLocaleString()}</div>
                <div class="stat-label">Generated</div>
            </div>
        </div>

        <div class="failures">
            ${data.failures
              .map(
                (failure, _idx) => `
                <div class="failure-card">
                    <div class="failure-header">
                        <span class="failure-icon">${failure.icon}</span>
                        <div class="failure-title">
                            <h2>${failure.title}</h2>
                            <div class="failure-meta">
                                <span class="category-badge">${failure.category}</span>
                                ${failure.file}:${failure.line || '?'}
                                • Duration: ${Math.round(failure.duration)}ms
                                ${failure.retry > 0 ? `• Retry ${failure.retry}/${failure.totalAttempts - 1}` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="error-box">
                        <strong>Error:</strong> ${failure.error.substring(0, 200)}${failure.error.length > 200 ? '...' : ''}
                    </div>

                    ${
                      failure.analysis
                        ? `
                    <div class="analysis-section">
                        <h3>🔮 AI Analysis</h3>
                        <p><strong>Root Cause:</strong> ${failure.analysis.rootCause}</p>
                        <div style="margin: 15px 0;">
                            <strong>Confidence: ${failure.analysis.confidence}%</strong>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${failure.analysis.confidence}%"></div>
                            </div>
                        </div>
                        <div class="suggestions">
                            <strong>💡 Suggestions:</strong>
                            ${failure.analysis.suggestions
                              .map(
                                (s, i) => `
                                <div class="suggestion">
                                    <strong>${i + 1}.</strong> ${s}
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    </div>
                    `
                        : '<div class="analysis-section"><p>⚠️ AI analysis not available (Set GEMINI_API_KEY environment variable)</p></div>'
                    }

                    <details>
                        <summary class="expandable" style="padding: 10px; background: #f8f9fa; border-radius: 4px; margin-top: 20px;">
                            <strong>🔍 View Stack Trace</strong>
                        </summary>
                        <div class="stack-trace">${failure.stack.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                    </details>
                </div>
            `
              )
              .join('')}
        </div>
    </div>

    <script>
        // Animate confidence bars on load
        window.addEventListener('load', () => {
            document.querySelectorAll('.confidence-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => bar.style.width = width, 100);
            });
        });
    </script>
</body>
</html>`;

  return html;
}

/**
 * Main execution
 */
async function main() {
  if (!ENABLED) {
    console.log('ℹ️  Lumos is disabled (LUMOS_ENABLED=false)');
    return;
  }

  console.log('\n🔮 Lumos - AI Test Failure Analyzer\n');

  // Check if Playwright report exists
  if (!fs.existsSync(PLAYWRIGHT_REPORT)) {
    console.error(`❌ Playwright report not found: ${PLAYWRIGHT_REPORT}`);
    console.log('💡 Run Playwright tests first to generate the report');
    process.exit(1);
  }

  // Parse report
  const { failures, stats, timestamp } =
    parsePlaywrightReport(PLAYWRIGHT_REPORT);

  if (failures.length === 0) {
    console.log('✅ No test failures found!');
    return;
  }

  console.log(`📊 Found ${failures.length} unique test failure(s)\n`);

  // Limit analysis
  const failuresToAnalyze = failures.slice(0, MAX_FAILURES);
  if (failures.length > MAX_FAILURES) {
    console.log(
      `⚠️  Analyzing first ${MAX_FAILURES} failures (limit set by LUMOS_MAX_FAILURES)\n`
    );
  }

  // Categorize and analyze each failure
  const analyzedFailures = [];

  for (const [index, failure] of failuresToAnalyze.entries()) {
    console.log(
      `\n[${index + 1}/${failuresToAnalyze.length}] Analyzing: ${failure.title}`
    );

    const { category, severity, icon } = categorizeFailure(failure.error);
    const analysis = await analyzeWithAI(failure);

    analyzedFailures.push({
      ...failure,
      category,
      severity,
      icon,
      analysis,
      context: `Test: ${failure.title} in ${failure.suite}`,
      location: {
        file: failure.file,
        line: failure.line,
        column: failure.column,
      },
    });

    if (analysis) {
      console.log(
        `   ✓ AI analysis complete (${analysis.confidence}% confidence)`
      );
    } else {
      console.log(`   ⚠️  AI analysis skipped`);
    }
  }

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Save JSON data
  const outputData = {
    timestamp,
    stats,
    failures: analyzedFailures,
    config: {
      model: GEMINI_MODEL,
      maxFailures: MAX_FAILURES,
    },
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(outputData, null, 2));
  console.log(`\n💾 Saved analysis data: ${OUTPUT_JSON}`);

  // Generate HTML report
  const html = generateHTMLReport(outputData);
  fs.writeFileSync(OUTPUT_HTML, html);
  console.log(`📄 Generated HTML report: ${OUTPUT_HTML}`);

  // Auto-open report
  if (AUTO_OPEN) {
    const { exec } = await import('child_process');
    exec(`open "${OUTPUT_HTML}"`);
    console.log(`\n🌐 Opening report in browser...`);
  }

  console.log('\n✅ Lumos analysis complete!\n');
}

main().catch((error) => {
  console.error('❌ Lumos failed:', error);
  process.exit(1);
});
