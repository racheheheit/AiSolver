const path = require("path");

const ALLOWED_PATHS = [
    /^src\//,
    /^tests?\//,
    /^__tests__\//,

    /^app\//,
    /^lib\//,
    /^server\//,
    /^components\//,
    /^utils\//,

    /^package\.json$/,
    /^package-lock\.json$/,
    /^yarn\.lock$/,
    /^pnpm-lock\.yaml$/,
    /^requirements\.txt$/,
    /^tsconfig\.json$/,
];

const BLOCKED_PATHS = [
    /(^|\/)\.env($|\.|\/)/,
    /(^|\/)secrets?(\/|$)/,
    /^\.github\/workflows\//,
    /(^|\/)\.git(\/|$)/,
];

function resolveInside(repoRoot, candidate) {

    if (
        typeof candidate !== "string" ||
        candidate.length === 0
    ) {
        return null;
    }

    if (path.isAbsolute(candidate)) {
        return null;
    }

    const normalizedRoot = path.resolve(repoRoot);

    const absolute = path.resolve(
        normalizedRoot,
        candidate
    );

    const relative = path.relative(
        normalizedRoot,
        absolute
    );

 
    if (
        relative.startsWith("..") ||
        path.isAbsolute(relative)
    ) {
        return null;
    }

    return {
        absolute,
        relative: relative
            .split(path.sep)
            .join("/")
    };
}

function validateFixPath(repoRoot, candidate) {

    if (
        typeof candidate !== "string" ||
        candidate.length === 0
    ) {
        return {
            ok: false,
            reason: "empty path"
        };
    }

    if (path.isAbsolute(candidate)) {
        return {
            ok: false,
            reason: "absolute paths not allowed"
        };
    }

    const normalizedRoot = path.resolve(repoRoot);

    const absolutePath = path.resolve(
        normalizedRoot,
        candidate
    );

    const relativePath = path.relative(
        normalizedRoot,
        absolutePath
    );

    if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath)
    ) {
        return {
            ok: false,
            reason: "path escapes repo root"
        };
    }

    const posixRelative =
        relativePath
            .split(path.sep)
            .join("/");

    for (const blocked of BLOCKED_PATHS) {

        if (blocked.test(posixRelative)) {

            return {
                ok: false,
                reason: `blocked path: ${posixRelative}`
            };
        }
    }

    const allowed = ALLOWED_PATHS.some(
        pattern => pattern.test(posixRelative)
    );

    if (!allowed) {
        return {
            ok: false,
            reason: `path not in allowlist: ${posixRelative}`
        };
    }

    return {
        ok: true,
        absolutePath,
        relativePath: posixRelative
    };
}

module.exports = {
    resolveInside,
    validateFixPath
};