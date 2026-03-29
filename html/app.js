(function () {
    var el = function (id) { return document.getElementById(id); };

    var hud       = el('hud');
    var vehPanel  = el('veh-panel');

    var CIRCUMFERENCE = 2 * Math.PI * 34;

    var rings = {
        health:  { ring: el('health-ring'),  val: el('health-val'),  wrap: el('health-circle'),  threshold: 25 },
        armor:   { ring: el('armor-ring'),   val: el('armor-val'),   wrap: el('armor-circle'),   threshold: 15 },
        hunger:  { ring: el('hunger-ring'),  val: el('hunger-val'),  wrap: el('hunger-circle'),  threshold: 20 },
        thirst:  { ring: el('thirst-ring'),  val: el('thirst-val'),  wrap: el('thirst-circle'),  threshold: 20 },
        stamina: { ring: el('stamina-ring'), val: el('stamina-val'), wrap: el('stamina-circle'), threshold: -1 },
        oxygen:  { ring: el('oxygen-ring'),  val: el('oxygen-val'),  wrap: el('oxygen-circle'),  threshold: -1 },
        stress:  { ring: el('stress-ring'),  val: el('stress-val'),  wrap: el('stress-circle'),  threshold: -1 }
    };

    var canvas     = el('speedo-cv');
    var ctx        = canvas ? canvas.getContext('2d') : null;

    var spdNumber  = el('spd-num');
    var spdUnit    = el('spd-unit');
    var gearEl     = el('veh-gear');
    var streetEl   = el('loc-street');
    var areaEl     = el('loc-area');
    var compassEl  = el('compass-dir');
    var timeEl     = el('time-val');
    var cashVal    = el('cash-val');
    var bankVal    = el('bank-val');
    var pidEl      = el('player-id');
    var voiceDot   = el('voice-dot');
    var voiceMic   = el('voice-mic');
    var cashChip   = el('cash-chip');
    var bankChip   = el('bank-chip');

    var smoothSpeed = 0;
    var smoothRpm = 0;
    var smoothFuel = 100;
    var targetSpeed = 0;
    var targetRpm = 0;
    var targetFuel = 100;
    var currentMaxSpd = 240;
    var gaugeActive = false;
    var prevCash = -1;
    var prevBank = -1;

    function setRing(key, pct) {
        var r = rings[key];
        if (!r || !r.ring) return;
        pct = Math.max(0, Math.min(100, pct));
        r.ring.style.strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * pct / 100);
        r.val.textContent = Math.floor(pct) + '%';
        if (r.threshold > 0 && pct <= r.threshold && pct > 0) {
            r.wrap.classList.add('low');
        } else {
            r.wrap.classList.remove('low');
        }
    }

    function formatMoney(amount) {
        if (!amount && amount !== 0) return '$0';
        var str = Math.floor(amount).toString();
        var result = '';
        var count = 0;
        for (var i = str.length - 1; i >= 0; i--) {
            result = str[i] + result;
            count++;
            if (count % 3 === 0 && i > 0) result = ',' + result;
        }
        return '$' + result;
    }

    var START_ANG = 0.8 * Math.PI;
    var END_ANG   = 2.2 * Math.PI;
    var ARC_SPAN  = END_ANG - START_ANG;
    var prevMaxSpd = 0;

    function drawGauge(speed, rpm, maxSpeed, fuel) {
        if (!ctx) return;
        if (!maxSpeed || maxSpeed < 10) maxSpeed = 240;
        if (fuel === undefined) fuel = 100;

        var w = canvas.width, h = canvas.height;
        var cx = w / 2, cy = h / 2;
        ctx.clearRect(0, 0, w, h);

        var outerR = w / 2 - 14;
        var innerR = outerR - 18;
        var rpmR   = innerR - 8;
        var fuelR  = rpmR - 6;
        var pct = Math.min(speed / maxSpeed, 1);
        var spdEnd = START_ANG + ARC_SPAN * pct;
        var rpmPct = Math.min(rpm, 1);
        var rpmEnd = START_ANG + ARC_SPAN * rpmPct;

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, START_ANG, END_ANG);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,.04)';
        ctx.lineCap = 'round';
        ctx.stroke();

        if (pct > 0.001) {
            var sGrad = ctx.createConicGradient(START_ANG, cx, cy);
            var ratio = ARC_SPAN / (2 * Math.PI);
            sGrad.addColorStop(0, '#48dbfb');
            sGrad.addColorStop(ratio * 0.5, '#0abde3');
            sGrad.addColorStop(ratio * 0.8, '#ff9f43');
            sGrad.addColorStop(ratio, '#ff4757');

            ctx.beginPath();
            ctx.arc(cx, cy, outerR, START_ANG, spdEnd);
            ctx.lineWidth = 4;
            ctx.strokeStyle = sGrad;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.save();
            ctx.shadowColor = pct > 0.75 ? 'rgba(255,71,87,.6)' : 'rgba(72,219,251,.5)';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, Math.max(START_ANG, spdEnd - 0.04), spdEnd);
            ctx.lineWidth = 4;
            ctx.strokeStyle = pct > 0.75 ? '#ff4757' : '#48dbfb';
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, rpmR, START_ANG, END_ANG);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,.03)';
        ctx.stroke();

        if (rpmPct > 0.001) {
            var rGrad = ctx.createLinearGradient(
                cx + rpmR * Math.cos(START_ANG), cy + rpmR * Math.sin(START_ANG),
                cx + rpmR * Math.cos(rpmEnd), cy + rpmR * Math.sin(rpmEnd)
            );
            rGrad.addColorStop(0, 'rgba(72,219,251,.1)');
            rGrad.addColorStop(1, rpmPct > 0.8 ? 'rgba(255,71,87,.45)' : 'rgba(72,219,251,.35)');

            ctx.beginPath();
            ctx.arc(cx, cy, rpmR, START_ANG, rpmEnd);
            ctx.lineWidth = 2;
            ctx.strokeStyle = rGrad;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        var fuelPct = Math.max(0, Math.min(100, fuel)) / 100;
        var fuelEnd = START_ANG + ARC_SPAN * fuelPct;

        ctx.beginPath();
        ctx.arc(cx, cy, fuelR, START_ANG, END_ANG);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,.03)';
        ctx.lineCap = 'round';
        ctx.stroke();

        if (fuelPct > 0.001) {
            var fColor;
            if (fuel < 20) fColor = '#ff4757';
            else if (fuel < 45) fColor = '#ff9f43';
            else fColor = '#2ed573';

            ctx.beginPath();
            ctx.arc(cx, cy, fuelR, START_ANG, fuelEnd);
            ctx.lineWidth = 3;
            ctx.strokeStyle = fColor;
            ctx.lineCap = 'round';
            ctx.stroke();

            if (fuel < 20) {
                ctx.save();
                ctx.shadowColor = 'rgba(255,71,87,.5)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(cx, cy, fuelR, START_ANG, fuelEnd);
                ctx.lineWidth = 3;
                ctx.strokeStyle = fColor;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }
        }

        var steps = 10;
        var labelR = outerR + 11;
        var tickOut = innerR + 16;
        var tickMaj = innerR + 2;
        var tickMin = innerR + 8;
        var totalTicks = steps * 4;

        for (var t = 0; t <= totalTicks; t++) {
            var ang = START_ANG + (ARC_SPAN / totalTicks) * t;
            var major = t % 4 === 0;
            var tIn  = major ? tickMaj : tickMin;

            var tPct = t / totalTicks;
            var passed = tPct <= pct;

            ctx.beginPath();
            ctx.moveTo(cx + tIn * Math.cos(ang), cy + tIn * Math.sin(ang));
            ctx.lineTo(cx + tickOut * Math.cos(ang), cy + tickOut * Math.sin(ang));
            ctx.lineWidth = major ? 2 : 1;

            if (passed && pct > 0.001) {
                if (tPct > 0.75) ctx.strokeStyle = 'rgba(255,71,87,.6)';
                else ctx.strokeStyle = 'rgba(72,219,251,.5)';
            } else {
                ctx.strokeStyle = major ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)';
            }
            ctx.stroke();

            if (major) {
                var lbl = Math.round(maxSpeed / steps * (t / 4));
                ctx.font = '600 9px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                if (passed && pct > 0.001) {
                    ctx.fillStyle = tPct > 0.75 ? 'rgba(255,71,87,.7)' : 'rgba(72,219,251,.6)';
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,.18)';
                }
                ctx.fillText(lbl, cx + labelR * Math.cos(ang), cy + labelR * Math.sin(ang));
            }
        }

        var needleLen = outerR - 28;
        var needleAng = START_ANG + ARC_SPAN * pct;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(needleAng);
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(needleLen, 0);
        ctx.lineTo(0, 2);
        ctx.closePath();

        var nColor = pct > 0.75 ? '#ff4757' : '#48dbfb';
        ctx.fillStyle = nColor;
        ctx.shadowColor = nColor;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#48dbfb';
        ctx.shadowColor = 'rgba(72,219,251,.5)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        prevMaxSpd = maxSpeed;

        var fuelIcoX = cx + (fuelR + 1) * Math.cos(START_ANG - 0.22);
        var fuelIcoY = cy + (fuelR + 1) * Math.sin(START_ANG - 0.22);
        ctx.save();
        ctx.font = '600 13px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = fuel < 20 ? 'rgba(255,71,87,.7)' : 'rgba(180,180,180,.45)';
        ctx.fillText('\u26FD', fuelIcoX, fuelIcoY);
        ctx.restore();
    }

    function animateGauge() {
        if (!gaugeActive) return;

        smoothSpeed += (targetSpeed - smoothSpeed) * 0.18;
        if (Math.abs(targetSpeed - smoothSpeed) < 0.5) smoothSpeed = targetSpeed;

        smoothRpm += (targetRpm - smoothRpm) * 0.2;
        if (Math.abs(targetRpm - smoothRpm) < 0.01) smoothRpm = targetRpm;

        smoothFuel += (targetFuel - smoothFuel) * 0.08;
        if (Math.abs(targetFuel - smoothFuel) < 0.5) smoothFuel = targetFuel;

        var displaySpeed = Math.round(smoothSpeed);
        if (spdNumber) spdNumber.textContent = displaySpeed;

        drawGauge(displaySpeed, smoothRpm, currentMaxSpd, smoothFuel);
        requestAnimationFrame(animateGauge);
    }

    function popChip(chip) {
        if (!chip) return;
        chip.classList.remove('pop');
        void chip.offsetWidth;
        chip.classList.add('pop');
    }

    window.addEventListener('message', function (event) {
        var data = event.data;
        if (!data || !data.action) return;

        switch (data.action) {
            case 'toggle':
                hud.classList.toggle('hidden', !data.show);
                break;

            case 'setConfig':
                if (!data.showCash && cashChip) cashChip.classList.add('hidden');
                if (!data.showBank && bankChip) bankChip.classList.add('hidden');
                break;

            case 'setDead':
                hud.classList.toggle('dead', data.dead);
                break;

            case 'cinematic':
                hud.classList.toggle('cinematic', data.hide);
                break;

            case 'update':
                if (data.status) {
                    setRing('health', data.status.health);
                    setRing('armor', data.status.armor);
                    setRing('hunger', data.status.hunger);
                    setRing('thirst', data.status.thirst);
                    setRing('stamina', data.status.stamina);
                    setRing('oxygen', data.status.oxygen);
                    setRing('stress', data.status.stress);

                    rings.armor.wrap.classList.toggle('hidden', data.status.armor <= 0);
                    rings.oxygen.wrap.classList.toggle('hidden', data.status.oxygen >= 100);
                    rings.stress.wrap.classList.toggle('hidden', data.status.stress <= 0);
                }

                if (data.street && streetEl) streetEl.textContent = data.street;
                if (data.area && areaEl) areaEl.textContent = data.area;
                if (data.heading && compassEl) compassEl.textContent = data.heading;
                if (data.time && timeEl) timeEl.textContent = data.time;
                if (data.playerId !== undefined && pidEl) pidEl.textContent = data.playerId;

                if (data.money) {
                    var newCash = formatMoney(data.money.cash);
                    if (cashVal && cashVal.textContent !== newCash) {
                        cashVal.textContent = newCash;
                        if (prevCash !== -1) popChip(cashChip);
                        prevCash = data.money.cash;
                    }

                    var newBank = formatMoney(data.money.bank);
                    if (bankVal && bankVal.textContent !== newBank) {
                        bankVal.textContent = newBank;
                        if (prevBank !== -1) popChip(bankChip);
                        prevBank = data.money.bank;
                    }
                }

                if (data.voiceLevel !== undefined) {
                    if (voiceDot) voiceDot.className = 'v-dot l-' + data.voiceLevel;
                    if (voiceMic) voiceMic.classList.toggle('active', data.voiceLevel >= 2);
                }

                if (data.inVehicle && data.vehicle) {
                    vehPanel.classList.remove('hidden');

                    targetSpeed = data.vehicle.speed;
                    targetRpm = data.vehicle.rpm || 0;
                    targetFuel = data.vehicle.fuel !== undefined ? data.vehicle.fuel : 100;

                    if (spdUnit) spdUnit.textContent = (data.vehicle.unit || 'kmh').toUpperCase();

                    var cls = data.vehicle.class;
                    if (cls === 7) currentMaxSpd = 280;
                    else if (cls === 6) currentMaxSpd = 260;
                    else if (cls === 4) currentMaxSpd = 180;
                    else if (cls === 8) currentMaxSpd = 160;
                    else if (cls === 13) currentMaxSpd = 60;
                    else currentMaxSpd = 240;

                    if (!gaugeActive) {
                        gaugeActive = true;
                        requestAnimationFrame(animateGauge);
                    }

                    var gearText = data.vehicle.gear === 0 ? 'R' : (data.vehicle.gear || 'N');
                    if (data.vehicle.speed < 1 && data.vehicle.gear === 0) gearText = 'N';
                    if (gearEl) gearEl.textContent = gearText;
                } else {
                    vehPanel.classList.add('hidden');
                    gaugeActive = false;
                    smoothSpeed = 0;
                    smoothRpm = 0;
                    targetSpeed = 0;
                    targetRpm = 0;
                }
                break;
        }
    });
})();
