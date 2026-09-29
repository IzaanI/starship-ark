/**
 * STARFIELD.JS — Dynamic Parallax Deep-Space Flight Engine
 * Starship Ark — Phase II: Flight Operations
 */

class StarfieldEngine {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Starfield canvas '${canvasId}' not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Speed multipliers
        this.baseSpeeds = {
            pause: 0.05,
            cruise: 2.2,
            warp: 5.8,
            hyper: 13.5
        };
        this.currentMode = options.initialMode || 'cruise';
        this.speedMultiplier = this.baseSpeeds[this.currentMode];
        this.targetSpeedMultiplier = this.speedMultiplier;
        this.boostEnabled = true;
        
        this.shipElement = options.shipElement || document.getElementById('ship-container');
        
        // Particle Pools
        this.stars = [];
        this.streaks = [];
        this.nebulae = [];
        this.exhaustParticles = [];
        
        this.initCanvasSize();
        this.createNebulae();
        this.createStars();
        
        window.addEventListener('resize', () => {
            this.initCanvasSize();
            this.createNebulae();
            this.createStars();
        });

        this.lastTime = performance.now();
        this.animFrameId = null;
    }

    initCanvasSize() {
        this.width = this.canvas.width = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
        this.height = this.canvas.height = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
    }

    createNebulae() {
        this.nebulae = [
            { x: this.width * 0.18, y: this.height * 0.12, r: 260, color: 'rgba(30, 20, 65, 0.25)', speed: 0.12 },
            { x: this.width * 0.82, y: this.height * 0.58, r: 290, color: 'rgba(10, 35, 70, 0.28)', speed: 0.18 },
            { x: this.width * 0.35, y: this.height * 0.85, r: 220, color: 'rgba(20, 50, 50, 0.22)', speed: 0.14 }
        ];
    }

    createStars() {
        this.stars = [];
        // Layer 1: Distant micro-stars (dim, slow)
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 0.8 + 0.6,
                baseSpeed: Math.random() * 0.4 + 0.3,
                baseAlpha: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.04 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
                color: '#b0c4de'
            });
        }

        // Layer 2: Mid-field stars (colored, medium speed)
        const starColors = ['#ffffff', '#a8d8ea', '#ffeaa7', '#81ecec', '#dfe6e9'];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 1.2 + 1.2,
                baseSpeed: Math.random() * 0.8 + 1.0,
                baseAlpha: Math.random() * 0.4 + 0.6,
                twinkleSpeed: Math.random() * 0.08 + 0.02,
                twinklePhase: Math.random() * Math.PI * 2,
                color: starColors[Math.floor(Math.random() * starColors.length)]
            });
        }

        // Layer 3: Foreground high-speed warp streaks
        this.streaks = [];
        for (let i = 0; i < 30; i++) {
            this.streaks.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                baseSpeed: Math.random() * 1.5 + 2.5,
                lengthFactor: Math.random() * 2.5 + 2.0,
                alpha: Math.random() * 0.5 + 0.5,
                color: Math.random() > 0.3 ? '#e0f7fa' : '#80deea'
            });
        }
    }

    setSpeedMode(mode) {
        if (this.baseSpeeds[mode] !== undefined) {
            this.currentMode = mode;
            this.targetSpeedMultiplier = this.baseSpeeds[mode];
            this.setBoostEnabled(mode !== 'pause');
        }
    }

    setBoostEnabled(enabled) {
        this.boostEnabled = enabled;
        if (!enabled) {
            this.exhaustParticles = [];
        }
    }

    getShipNozzleMetrics() {
        if (!this.shipElement) return null;
        const imgEl = this.shipElement.querySelector('#ship-img') || this.shipElement;
        const rect = imgEl.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();

        const shipLeft = rect.left - canvasRect.left;
        const shipTop = rect.top - canvasRect.top;
        const shipWidth = rect.width;
        const shipHeight = rect.height;

        return {
            shipLeft,
            shipTop,
            shipWidth,
            shipHeight,
            nozzleY: shipTop + shipHeight * 0.935,
            bellRadius: shipWidth * 0.026,
            nozzles: [
                shipLeft + shipWidth * 0.4028,
                shipLeft + shipWidth * 0.4990,
                shipLeft + shipWidth * 0.5952
            ]
        };
    }

    drawThrusterFlames(ctx, timestamp) {
        if (this.currentMode === 'pause' || !this.boostEnabled) return;

        const metrics = this.getShipNozzleMetrics();
        if (!metrics) return;

        const { nozzleY, bellRadius, nozzles, shipHeight } = metrics;

        // Base flame length according to mode
        let baseLen = 0;
        let coreColor = 'rgba(230, 255, 255, 0.95)';
        let outerColor = 'rgba(0, 190, 255, 0.75)';

        if (this.currentMode === 'cruise') {
            baseLen = shipHeight * 0.12; // ~55-70px
        } else if (this.currentMode === 'warp') {
            baseLen = shipHeight * 0.24; // ~120-140px
        } else if (this.currentMode === 'hyper') {
            baseLen = shipHeight * 0.42; // ~220-260px
            coreColor = 'rgba(255, 255, 255, 1.0)';
            outerColor = 'rgba(60, 230, 255, 0.9)';
        }

        ctx.save();
        for (let i = 0; i < nozzles.length; i++) {
            const nx = nozzles[i];
            // Dynamic plasma flame flicker
            const flicker = Math.sin(timestamp * 0.038 + i * 2.1) * (baseLen * 0.08) + (Math.random() - 0.5) * (baseLen * 0.06);
            const currentLen = Math.max(10, baseLen + flicker);
            const tipY = nozzleY + currentLen;

            // 1. Soft Outer Atmospheric Radial Bloom
            const bloomGrad = ctx.createRadialGradient(nx, nozzleY + currentLen * 0.35, 2, nx, nozzleY + currentLen * 0.35, currentLen * 0.65);
            bloomGrad.addColorStop(0, 'rgba(0, 180, 255, 0.35)');
            bloomGrad.addColorStop(1, 'rgba(0, 70, 200, 0)');
            ctx.fillStyle = bloomGrad;
            ctx.beginPath();
            ctx.arc(nx, nozzleY + currentLen * 0.35, currentLen * 0.65, 0, Math.PI * 2);
            ctx.fill();

            // 2. Main Outer Plasma Jet Cone
            const outerGrad = ctx.createLinearGradient(nx, nozzleY, nx, tipY);
            outerGrad.addColorStop(0, outerColor);
            outerGrad.addColorStop(0.35, 'rgba(0, 175, 255, 0.68)');
            outerGrad.addColorStop(0.75, 'rgba(0, 120, 240, 0.35)');
            outerGrad.addColorStop(1, 'rgba(0, 60, 200, 0)');

            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.moveTo(nx - bellRadius, nozzleY);
            ctx.quadraticCurveTo(nx - bellRadius * 1.15, nozzleY + currentLen * 0.38, nx, tipY);
            ctx.quadraticCurveTo(nx + bellRadius * 1.15, nozzleY + currentLen * 0.38, nx + bellRadius, nozzleY);
            ctx.closePath();
            ctx.fill();

            // 3. Hot Inner White-Cyan Core Flame
            const innerLen = currentLen * 0.62;
            const innerTipY = nozzleY + innerLen;
            const innerRadius = bellRadius * 0.55;

            const innerGrad = ctx.createLinearGradient(nx, nozzleY, nx, innerTipY);
            innerGrad.addColorStop(0, coreColor);
            innerGrad.addColorStop(0.5, 'rgba(170, 245, 255, 0.88)');
            innerGrad.addColorStop(1, 'rgba(0, 210, 255, 0)');

            ctx.fillStyle = innerGrad;
            ctx.beginPath();
            ctx.moveTo(nx - innerRadius, nozzleY);
            ctx.quadraticCurveTo(nx - innerRadius * 1.1, nozzleY + innerLen * 0.42, nx, innerTipY);
            ctx.quadraticCurveTo(nx + innerRadius * 1.1, nozzleY + innerLen * 0.42, nx + innerRadius, nozzleY);
            ctx.closePath();
            ctx.fill();

            // 4. Mach Shock Diamonds (Pulsing Diamond Nodes in High Thrust)
            if (this.currentMode === 'warp' || this.currentMode === 'hyper') {
                const diamondCount = this.currentMode === 'hyper' ? 4 : 2;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                for (let d = 1; d <= diamondCount; d++) {
                    const dy = nozzleY + (currentLen * 0.18 * d);
                    const dw = bellRadius * 0.38 * (1 - d * 0.16);
                    const dh = dw * 1.6;
                    ctx.beginPath();
                    ctx.moveTo(nx, dy - dh);
                    ctx.lineTo(nx + dw, dy);
                    ctx.lineTo(nx, dy + dh);
                    ctx.lineTo(nx - dw, dy);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    spawnExhaustParticles() {
        if (this.currentMode === 'pause' || !this.boostEnabled) return;

        const metrics = this.getShipNozzleMetrics();
        if (!metrics) return;

        const { nozzleY, nozzles, bellRadius } = metrics;
        const particleCount = this.currentMode === 'hyper' ? 5 : (this.currentMode === 'warp' ? 3 : 2);

        for (let n of nozzles) {
            for (let i = 0; i < particleCount; i++) {
                this.exhaustParticles.push({
                    x: n + (Math.random() - 0.5) * (bellRadius * 1.4),
                    y: nozzleY + Math.random() * 8,
                    vx: (Math.random() - 0.5) * 1.8,
                    vy: (Math.random() * 3 + 5) * (this.speedMultiplier / 2),
                    size: Math.random() * 3.5 + 2,
                    alpha: 0.95,
                    decay: Math.random() * 0.04 + 0.03,
                    color: Math.random() > 0.35 ? 'rgba(0, 240, 255,' : 'rgba(210, 255, 255,'
                });
            }
        }
    }

    render(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Smooth speed interpolation
        this.speedMultiplier += (this.targetSpeedMultiplier - this.speedMultiplier) * 0.08;

        const ctx = this.ctx;
        ctx.fillStyle = '#020307';
        ctx.fillRect(0, 0, this.width, this.height);

        // 1. Draw Nebulae
        for (let neb of this.nebulae) {
            neb.y += neb.speed * this.speedMultiplier;
            if (neb.y - neb.r > this.height) {
                neb.y = -neb.r;
                neb.x = Math.random() * this.width;
            }

            const grad = ctx.createRadialGradient(neb.x, neb.y, 10, neb.x, neb.y, neb.r);
            grad.addColorStop(0, neb.color);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(neb.x, neb.y, neb.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Draw Background Stars (Layers 1 & 2)
        for (let star of this.stars) {
            star.y += star.baseSpeed * this.speedMultiplier;
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }

            star.twinklePhase += star.twinkleSpeed;
            const alpha = Math.max(0.1, star.baseAlpha + Math.sin(star.twinklePhase) * 0.25);

            ctx.fillStyle = star.color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        // 3. Draw Foreground Warp Streaks (Layer 3)
        const streakLength = Math.max(2, this.speedMultiplier * 3.5);
        for (let s of this.streaks) {
            s.y += s.baseSpeed * this.speedMultiplier;
            if (s.y > this.height) {
                s.y = -streakLength;
                s.x = Math.random() * this.width;
            }

            const currentLen = streakLength * s.lengthFactor;
            const grad = ctx.createLinearGradient(s.x, s.y - currentLen, s.x, s.y);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
            grad.addColorStop(1, s.color);

            ctx.strokeStyle = grad;
            ctx.lineWidth = this.speedMultiplier > 8 ? 2.0 : 1.2;
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - currentLen);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
        }

        // 4. Draw Animated Thruster Boost Cones
        this.drawThrusterFlames(ctx, timestamp);

        // 5. Update & Draw Thruster Exhaust Plasma Particles
        this.spawnExhaustParticles();
        for (let i = this.exhaustParticles.length - 1; i >= 0; i--) {
            const p = this.exhaustParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            p.size *= 0.96;

            if (p.alpha <= 0.05 || p.size <= 0.5) {
                this.exhaustParticles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = `${p.color}${p.alpha})`;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;

        // 6. Starship Idle Float Vibration
        if (this.shipElement) {
            const idleOffset = Math.sin(timestamp * 0.002) * 1.5;
            const engineJitter = this.speedMultiplier > 8 ? (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 0.4;
            this.shipElement.style.transform = `translateY(${idleOffset + engineJitter}px)`;
        }

        this.animFrameId = requestAnimationFrame(this.render.bind(this));
    }

    start() {
        if (!this.animFrameId) {
            this.lastTime = performance.now();
            this.animFrameId = requestAnimationFrame(this.render.bind(this));
        }
    }

    stop() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StarfieldEngine;
}
