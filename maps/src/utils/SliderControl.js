L.Control.SliderControl = L.Control.extend({
    options: {
        position: 'topright',
        layers: null,
        timeAttribute: 'time',
        isEpoch: false,
        startTimeIdx: 0,
        timeStrLength: 19,
        showAllOnStart: false,
        markers: null,
        range: false,
        follow: false,
        sameDate: false,
        alwaysShowDate: false,
        rezoom: null,
        minGapMs: 24 * 60 * 60 * 1000 // gap mínimo entre thumbs: 1 día
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._layer = this.options.layer;
        this._currentMinTs = 0;
        this._currentMaxTs = 0;
        this._minTs = 0;
        this._maxTs = 0;
    },

    extractTimestamp: function (time, options) {
        if (options.isEpoch) {
            time = (new Date(parseInt(time))).toString();
        }
        return time.substr(options.startTimeIdx, options.startTimeIdx + options.timeStrLength);
    },

    _markerTs: function (marker) {
        if (!marker) return NaN;
        let timeValue;
        if (marker.feature && marker.feature.properties[this.options.timeAttribute]) {
            timeValue = marker.feature.properties[this.options.timeAttribute];
        } else if (marker.options && marker.options[this.options.timeAttribute]) {
            timeValue = marker.options[this.options.timeAttribute];
        }
        if (!timeValue) return NaN;
        const dateStr = this.extractTimestamp(timeValue, this.options).split(' ')[0];
        return Date.parse(dateStr);
    },

    _fmtDate: function (ts) {
        if (!isFinite(ts)) return '';
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    onAdd: function (map) {
        this.options.map = map;

        var container = L.DomUtil.create('div', 'slider', this._container);
        container.innerHTML = `
            <div id="leaflet-slider" style="background:rgba(255,255,255,0.95);padding:6px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.3);font-size:12px;color:#333;">
                <div id="sliderTrackArea" style="position:relative;height:16px;user-select:none;touch-action:none;cursor:pointer;">
                    <div id="sliderTrackBg" style="position:absolute;top:50%;left:0;right:0;transform:translateY(-50%);height:3px;background:#d1d5db;border-radius:2px;pointer-events:none;">
                        <div id="rangeTrack" style="position:absolute;height:100%;background:#2563eb;border-radius:2px;"></div>
                    </div>
                    <div id="thumbMin" style="position:absolute;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#2563eb;border:none;border-radius:50%;cursor:grab;z-index:3;box-sizing:border-box;"></div>
                    <div id="thumbMax" style="position:absolute;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#2563eb;border:none;border-radius:50%;cursor:grab;z-index:3;box-sizing:border-box;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:3px;font-weight:600;font-size:11px;color:#333;">
                    <span id="startDate" title="Click para editar fecha" style="cursor:pointer;text-decoration:underline dotted;"></span>
                    <span id="endDate" title="Click para editar fecha" style="cursor:pointer;text-decoration:underline dotted;"></span>
                </div>
            </div>`;

        const style = document.createElement('style');
        style.textContent = `.slider { margin:0; width:clamp(180px,32vw,260px); }`;
        document.head.appendChild(style);

        this._trackArea     = container.querySelector('#sliderTrackArea');
        this._rangeTrack    = container.querySelector('#rangeTrack');
        this._thumbMin      = container.querySelector('#thumbMin');
        this._thumbMax      = container.querySelector('#thumbMax');
        this._startDateSpan = container.querySelector('#startDate');
        this._endDateSpan   = container.querySelector('#endDate');

        // Recolectar markers + timestamps
        this.options.markers = [];
        let minTs = Infinity, maxTs = -Infinity;
        if (this._layer) {
            this._layer.eachLayer((layer) => {
                this.options.markers.push(layer);
                const ts = this._markerTs(layer);
                if (isFinite(ts)) {
                    if (ts < minTs) minTs = ts;
                    if (ts > maxTs) maxTs = ts;
                }
            });
        }

        // Si no hay fechas válidas, usar rango por defecto (hoy)
        if (!isFinite(minTs) || !isFinite(maxTs)) {
            minTs = maxTs = Date.now();
        }
        // Asegurar al menos 1 día de rango
        if (maxTs - minTs < this.options.minGapMs) {
            maxTs = minTs + this.options.minGapMs;
        }
        this._minTs = minTs;
        this._maxTs = maxTs;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
    },

    onRemove: function (map) {
        (this.options.markers || []).forEach((m) => {
            if (!m) return;
            if (m._parentGroup && typeof m._parentGroup.hasLayer === 'function' && m._parentGroup.hasLayer(m)) {
                m._parentGroup.removeLayer(m);
            } else if (map.hasLayer(m)) {
                map.removeLayer(m);
            }
        });
    },

    _pxToTs: function (clientX) {
        const rect = this._trackArea.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(this._minTs + pct * (this._maxTs - this._minTs));
    },

    _applyValues: function (updateMarkers) {
        const span = this._maxTs - this._minTs;
        const minPct = span > 0 ? ((this._currentMinTs - this._minTs) / span) * 100 : 0;
        const maxPct = span > 0 ? ((this._currentMaxTs - this._minTs) / span) * 100 : 100;

        this._thumbMin.style.left  = minPct + '%';
        this._thumbMax.style.left  = maxPct + '%';
        this._rangeTrack.style.left  = minPct + '%';
        this._rangeTrack.style.right = (100 - maxPct) + '%';

        localStorage.setItem('sliderRangeMinTs', this._currentMinTs);
        localStorage.setItem('sliderRangeMaxTs', this._currentMaxTs);

        this._startDateSpan.textContent = this._fmtDate(this._currentMinTs);
        this._endDateSpan.textContent   = this._fmtDate(this._currentMaxTs);

        if (updateMarkers) this._updateMarkers();
    },

    _setupThumbDrag: function (thumb, isMin) {
        const gap = this.options.minGapMs;

        const onMove = (e) => {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const ts = this._pxToTs(clientX);
            if (isMin) {
                this._currentMinTs = Math.max(this._minTs, Math.min(ts, this._currentMaxTs - gap));
            } else {
                this._currentMaxTs = Math.min(this._maxTs, Math.max(ts, this._currentMinTs + gap));
            }
            this._applyValues(false);
        };

        const onEnd = () => {
            thumb.style.cursor = 'grab';
            this.options.map.dragging.enable();
            this._applyValues(true);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        const onStart = (e) => {
            e.preventDefault();
            e.stopPropagation();
            thumb.style.cursor = 'grabbing';
            this.options.map.dragging.disable();
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        thumb.addEventListener('mousedown', onStart);
        thumb.addEventListener('touchstart', onStart, { passive: false });
    },

    _setupTrackClick: function () {
        this._trackArea.addEventListener('click', (e) => {
            if (e.target === this._thumbMin || e.target === this._thumbMax) return;

            const gap = this.options.minGapMs;
            const ts  = this._pxToTs(e.clientX);

            const distMin = Math.abs(ts - this._currentMinTs);
            const distMax = Math.abs(ts - this._currentMaxTs);

            if (ts <= this._currentMinTs) {
                this._currentMinTs = Math.max(this._minTs, ts);
            } else if (ts >= this._currentMaxTs) {
                this._currentMaxTs = Math.min(this._maxTs, ts);
            } else if (distMin <= distMax) {
                this._currentMinTs = Math.max(this._minTs, Math.min(ts, this._currentMaxTs - gap));
            } else {
                this._currentMaxTs = Math.min(this._maxTs, Math.max(ts, this._currentMinTs + gap));
            }
            this._applyValues(true);
        });
    },

    _setupDateEdit: function () {
        const edit = (span, isMin) => {
            span.addEventListener('click', () => {
                if (span.querySelector('input')) return;
                const current = span.textContent || '';
                const isoDate = current.length === 10 ? current : '';

                const input = document.createElement('input');
                input.type = 'date';
                input.value = isoDate;
                input.style.cssText = 'font-size:0.75rem;font-weight:700;color:#000;border:none;background:transparent;outline:1px solid hsl(var(--p,262 80% 50%));border-radius:3px;padding:0 2px;width:100px;cursor:pointer;';

                span.textContent = '';
                span.appendChild(input);
                input.focus();
                try { input.showPicker(); } catch (_) {}

                const commit = () => {
                    const val = input.value;
                    if (val) {
                        const ts = Date.parse(val);
                        if (!isNaN(ts)) {
                            const gap = this.options.minGapMs;
                            if (isMin) {
                                this._currentMinTs = Math.min(ts, this._currentMaxTs - gap);
                                if (this._currentMinTs < this._minTs) this._minTs = this._currentMinTs;
                            } else {
                                this._currentMaxTs = Math.max(ts, this._currentMinTs + gap);
                                if (this._currentMaxTs > this._maxTs) this._maxTs = this._currentMaxTs;
                            }
                        }
                    }
                    this._applyValues(true);
                };

                input.addEventListener('change', commit);
                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur();
                    if (e.key === 'Escape') this._applyValues(false);
                });
            });
        };
        edit(this._startDateSpan, true);
        edit(this._endDateSpan, false);
    },

    _updateMarkers: function () {
        const map = this.options.map;
        const minTs = this._currentMinTs;
        const maxTs = this._currentMaxTs;
        const fg = this.options.rezoom ? L.featureGroup() : null;

        const hide = (m) => {
            const pg = m._parentGroup;
            if (pg && typeof pg.removeLayer === 'function') {
                pg.removeLayer(m);
            } else if (map.hasLayer(m)) {
                map.removeLayer(m);
            }
        };
        const show = (m) => {
            const pg = m._parentGroup;
            if (pg && typeof pg.addLayer === 'function') {
                pg.addLayer(m);
            } else if (!map.hasLayer(m)) {
                map.addLayer(m);
            }
        };

        (this.options.markers || []).forEach((m) => {
            if (!m) return;
            const ts = this._markerTs(m);
            if (!isFinite(ts) || ts < minTs || ts > maxTs) {
                hide(m);
            } else {
                show(m);
                if (fg) fg.addLayer(m);
            }
        });

        if (fg && this.options.rezoom) {
            map.fitBounds(fg.getBounds(), { maxZoom: this.options.rezoom });
        }
    },

    startSlider: function () {
        const gap = this.options.minGapMs;
        const savedMin = localStorage.getItem('sliderRangeMinTs');
        const savedMax = localStorage.getItem('sliderRangeMaxTs');

        if (savedMin !== null && savedMax !== null) {
            let rMin = parseInt(savedMin);
            let rMax = parseInt(savedMax);
            if (isNaN(rMin) || isNaN(rMax) || rMax - rMin < gap) {
                rMin = this._minTs;
                rMax = this._maxTs;
            }
            // Extender el rango total si las fechas guardadas lo superan
            if (rMin < this._minTs) this._minTs = rMin;
            if (rMax > this._maxTs) this._maxTs = rMax;
            this._currentMinTs = rMin;
            this._currentMaxTs = rMax;
        } else if (this.options.showAllOnStart) {
            this._currentMinTs = this._minTs;
            this._currentMaxTs = this._maxTs;
        } else {
            this._currentMinTs = this._minTs;
            this._currentMaxTs = Math.floor((this._maxTs - this._minTs) / 2) + this._minTs;
        }

        this._setupThumbDrag(this._thumbMin, true);
        this._setupThumbDrag(this._thumbMax, false);
        this._setupTrackClick();
        this._setupDateEdit();

        this._applyValues(true);
    }
});

L.control.sliderControl = function (options) {
    return new L.Control.SliderControl(options);
};
