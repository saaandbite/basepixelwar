module.exports = {
    apps: [
        {
            name: 'pixelwar-web',
            cwd: './apps/web',
            script: 'npm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                // Next.js uses PORT env var to determine which port to listen on.
                // We map our WEB_PORT to it.
                PORT: 8080,
            },
        },
        {
            name: 'pixelwar-server',
            cwd: './apps/server',
            script: 'npm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                // Our server code explicitly looks for SERVER_PORT
                SERVER_PORT: 3000,
            },
        },
    ],
};
