const { execFileSync } = require('child_process');

function getGitBranch(cwd) {
    try {
        return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
            cwd,
            encoding: 'utf8',
            timeout: 500,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    } catch (_) {
        return '';
    }
}

function formatContextPercentage(data) {
    const pct = data.context_window?.used_percentage;
    if (pct === null || pct === undefined) return '0%';
    return `${Math.round(pct)}%`;
}

function formatCwd(cwd) {
    if (!cwd) return 'unknown';
    return cwd.length > 40 ? '...' + cwd.slice(-37) : cwd;
}

function buildStatusLine(data) {
    const contextPct = formatContextPercentage(data);
    const version = data.version || 'unknown';
    const model = data.model?.display_name || data.model?.id || 'unknown';
    const cwd = data.workspace?.current_dir || data.cwd || process.cwd();
    const branch = data.worktree?.branch || getGitBranch(cwd) || '';
    const worktree = data.worktree?.name || data.workspace?.git_worktree || '';

    const parts = [
        version,
        model,
        contextPct,
        formatCwd(cwd)
    ];

    if (branch) {
        parts.push(branch);
    }

    if (worktree) {
        parts.push(worktree);
    }

    return parts.join(' | ');
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        const data = input.trim() ? JSON.parse(input) : {};
        process.stdout.write(buildStatusLine(data));
    } catch (error) {
        process.stdout.write('Claude Code');
    }
});