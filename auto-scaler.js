import { cpus as _cpus, freemem, totalmem } from 'os';
import { exec } from 'child_process';

const MAX_INSTANCES = process.env.MAX_INSTANCES || 8;
const CPU_THRESHOLD = process.env.CPU_THRESHOLD || 70;
const MEMORY_THRESHOLD = process.env.MEMORY_THRESHOLD || 80;
const INTERVAL = 5000; // Check system load every 5 seconds

const serviceName = 'queue-worker'; // Change this if needed

console.log(`Auto-scaler started for ${serviceName}...`);

const checkAndScale = () => {
    const cpuLoad = getCPUUsage();
    const memoryLoad = getMemoryUsage();

    console.log(`CPU: ${cpuLoad.toFixed(2)}% | Memory: ${memoryLoad.toFixed(2)}%`);

    exec(`pm2 jlist`, (err, stdout) => {
        if (err) {
            console.error('Error fetching PM2 list:', err);
            return;
        }

        try {
            const processes = JSON.parse(stdout);
            const worker = processes.find(proc => proc.name === serviceName);

            if (!worker) {
                console.error(`Service ${serviceName} not found in PM2.`);
                return;
            }

            const currentInstances = worker.pm2_env.instances;
            
            if ((cpuLoad > CPU_THRESHOLD || memoryLoad > MEMORY_THRESHOLD) && currentInstances < MAX_INSTANCES) {
                scaleInstances(currentInstances + 1);
            } else if (cpuLoad < (CPU_THRESHOLD - 20) && memoryLoad < (MEMORY_THRESHOLD - 20) && currentInstances > 1) {
                scaleInstances(currentInstances - 1);
            }

        } catch (parseError) {
            console.error('Error parsing PM2 JSON output:', parseError);
        }
    });
};

const scaleInstances = (newInstances) => {
    exec(`pm2 jlist`, (err, stdout) => {
        if (err) {
            console.error('Error fetching PM2 process list:', err);
            return;
        }

        try {
            const processes = JSON.parse(stdout);
            const worker = processes.find(proc => proc.name === serviceName);

            if (!worker) {
                console.error(`Service ${serviceName} not found in PM2.`);
                return;
            }

            const currentInstances = worker.pm2_env.instances;

            if (currentInstances >= newInstances && newInstances > 0) {
                console.log(`No scaling needed. queue-worker already at ${newInstances} instances.`);
                return;
            }

            console.log(`Scaling queue-worker to ${newInstances} instances...`);
            exec(`pm2 scale ${serviceName} ${newInstances}`, (err, stdout) => {
                if (err) {
                    console.error('Error scaling instances:', err);
                } else {
                    console.log(stdout);
                }
            });

        } catch (parseError) {
            console.error('Error parsing PM2 JSON output:', parseError);
        }
    });
};

const getCPUUsage = () => {
    const cpus = _cpus();
    let idleMs = 0, totalMs = 0;

    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            totalMs += cpu.times[type];
        }
        idleMs += cpu.times.idle;
    });

    return 100 - (idleMs / totalMs) * 100;
};

const getMemoryUsage = () => {
    return (freemem() / totalmem()) * 100;
};

// Start checking system load every `INTERVAL` ms
setInterval(checkAndScale, INTERVAL);