L.Control.SliderControl = L.Control.extend({
    options: {
        position: 'topright',
        layers: null,
        timeAttribute: 'time',
        isEpoch: false,
        startTimeIdx: 0,
        timeStrLength: 19,
        maxValue: -1,
        minValue: 0,
        showAllOnStart: false,
        markers: null,
        range: false,
        follow: false,
        sameDate: false,
        alwaysShowDate: false,
        rezoom: null,
        minGap: 1
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._layer = this.options.layer;
        this._dates = [];
        this._currentMin = 0;
        this._currentMax = 0;
    },

    extractTimestamp: function (time, options) {
        if (options.isEpoch) {
            time = (new Date(parseInt(time))).toString();
        }
        return time.substr(options.startTimeIdx, options.startTimeIdx + options.timeStrLength);
    },

    onAdd: function (map) {
        this.options.map = map;

        var container = L.DomUtil.create('div', 'slider', this._container);
        container.innerHTML = `
            <div id="leaflet-slider" style="background:rgba(255,255,255,0.95);padding:6px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.3);font-size:12px;color:#333;">
                <div id="sliderTrackArea" style="position:relative;height:16px;user-select:none;touch-action:none;cursor:pointer;">
                    <!-- Track fondo -->
                    <div id="sliderTrackBg" style="position:absolute;top:50%;left:0;right:0;transform:translateY(-50%);height:3px;background:#d1d5db;border-radius:2px;pointer-events:none;">
                        <div id="rangeTrack" style="position:absolute;height:100%;background:#2563eb;border-radius:2px;"></div>
                    </div>
                    <!-- Thumbs -->
                    <div id="thumbMin" style="position:absolute;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#2563eb;border:none;border-radius:50%;cursor:grab;z-index:3;box-sizing:border-box;"></div>
                    <div id="thumbMax" style="position:absolute;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#2563eb;border:none;border-radius:50%;cursor:grab;z-index:3;box-sizing:border-box;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:3px;font-weight:600;font-size:11px;color:#333;">
                    <span id="startDate" title="Click para editar fecha" style="cursor:pointer;text-decoration:underline dotted;"></span>
                    <span id="endDate"></span>
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

        // Cargar marcadores
        var options = this.options;
        options.markers = [];
        this._dates = [];

        if (this._layer) {
            var idx = 0;
            this._layer.eachLayer((layer) => {
                options.markers[idx] = layer;
                let timeValue;
                if (layer.feature && layer.feature.properties[this.options.timeAttribute]) {
                    timeValue = layer.feature.properties[this.options.timeAttribute];
                } else if (layer.options[this.options.timeAttribute]) {
                    timeValue = layer.options[this.options.timeAttribute];
                }
                if (timeValue) {
                    const dateStr = this.extractTimestamp(timeValue, this.options);
                    this._dates[idx] = dateStr.split(' ')[0];
                } else {
                    this._dates[idx] = `Fecha ${idx}`;
                }
                idx++;
            });

            // Ordenar por fecha ascendente (más antigua a la izquierda, más moderna a la derecha)
            const pairs = options.markers.map((m, i) => ({ marker: m, date: this._dates[i] }));
            pairs.sort((a, b) => {
                const da = Date.parse(a.date);
                const db = Date.parse(b.date);
                if (isNaN(da) && isNaN(db)) return 0;
                if (isNaN(da)) return 1;
                if (isNaN(db)) return -1;
                return da - db;
            });
            options.markers = pairs.map(p => p.marker);
            this._dates = pairs.map(p => p.date);

            options.maxValue = idx - 1;
            this.options = options;
        }

        // Prevenir que el mapa reciba eventos del slider
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
    },

    onRemove: function (map) {
        for (var i = this.options.minValue; i <= this.options.maxValue; i++) {
            var m = this.options.markers[i];
            if (!m) continue;
            if (m._parentGroup && typeof m._parentGroup.hasLayer === 'function' && m._parentGroup.hasLayer(m)) {
                m._parentGroup.removeLayer(m);
            } else {
                map.removeLayer(m);
            }
        }
    },

    // ── Posición en px → valor del slider ─────────────────────────────────────
    _pxToVal: function (clientX) {
        const rect = this._trackArea.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const lo   = this.options.minValue;
        const hi   = this.options.maxValue;
        return Math.round(pct * (hi - lo) + lo);
    },

    // ── Actualizar UI y marcadores a partir de _currentMin / _currentMax ───────
    _applyValues: function (updateMarkers) {
        const lo  = this.options.minValue;
        const hi  = this.options.maxValue;
        const min = this._currentMin;
        const max = this._currentMax;

        const minPct = hi > lo ? ((min - lo) / (hi - lo)) * 100 : 0;
        const maxPct = hi > lo ? ((max - lo) / (hi - lo)) * 100 : 100;

        this._thumbMin.style.left  = minPct + '%';
        this._thumbMax.style.left  = maxPct + '%';
        this._rangeTrack.style.left  = minPct + '%';
        this._rangeTrack.style.right = (100 - maxPct) + '%';

        localStorage.setItem('sliderRangeMin', min);
        localStorage.setItem('sliderRangeMax', max);

        // Fechas
        const mk0 = this.options.markers[min];
        const mk1 = this.options.markers[max];
        if (mk0) this._startDateSpan.textContent = this._dates[min] || '';
        if (mk1) this._endDateSpan.textContent   = this._dates[max] || '';

        if (updateMarkers) this._updateMarkers(min, max);
    },

    // ── Drag de un thumb ──────────────────────────────────────────────────────��
    _setupThumbDrag: function (thumb, isMin) {
        const lo  = this.options.minValue;
        const hi  = this.options.maxValue;
        const gap = this.options.minGap;

        const onMove = (e) => {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const val = this._pxToVal(clientX);
            if (isMin) {
                this._currentMin = Math.max(lo, Math.min(val, this._currentMax - gap));
            } else {
                this._currentMax = Math.min(hi, Math.max(val, this._currentMin + gap));
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

    // ── Click en la barra: mueve el thumb más cercano ─────────────────────────
    _setupTrackClick: function () {
        this._trackArea.addEventListener('click', (e) => {
            // Ignorar si el click fue directamente en un thumb
            if (e.target === this._thumbMin || e.target === this._thumbMax) return;

            const lo  = this.options.minValue;
            const hi  = this.options.maxValue;
            const gap = this.options.minGap;
            const val = this._pxToVal(e.clientX);

            const distMin = Math.abs(val - this._currentMin);
            const distMax = Math.abs(val - this._currentMax);

            // Si click a la izquierda de min → mueve min
            // Si click a la derecha de max → mueve max
            // Si en medio → mueve el más cercano
            if (val <= this._currentMin) {
                this._currentMin = Math.max(lo, val);
            } else if (val >= this._currentMax) {
                this._currentMax = Math.min(hi, val);
            } else if (distMin <= distMax) {
                this._currentMin = Math.max(lo, Math.min(val, this._currentMax - gap));
            } else {
                this._currentMax = Math.min(hi, Math.max(val, this._currentMin + gap));
            }
            this._applyValues(true);
        });
    },

    _updateTimestamp: function (marker) {
        if (!marker) return null;
        let timeValue;
        if (marker.feature && marker.feature.properties[this.options.timeAttribute]) {
            timeValue = marker.feature.properties[this.options.timeAttribute];
        } else if (marker.options[this.options.timeAttribute]) {
            timeValue = marker.options[this.options.timeAttribute];
        }
        if (!timeValue) return null;
        return this.extractTimestamp(timeValue, this.options);
    },

    // ── Click en fecha izquierda: edición inline ──────────────────────────────
    _setupDateEdit: function () {
        this._startDateSpan.addEventListener('click', () => {
            const current = this._dates[this._currentMin] || '';
            // Normalizar a YYYY-MM-DD si viene en otro formato
            const isoDate = current.length === 10 ? current : '';

            const input = document.createElement('input');
            input.type = 'date';
            input.value = isoDate;
            input.style.cssText = 'font-size:0.75rem;font-weight:700;color:#000;border:none;background:transparent;outline:1px solid hsl(var(--p,262 80% 50%));border-radius:3px;padding:0 2px;width:100px;cursor:pointer;';

            const span = this._startDateSpan;
            span.textContent = '';
            span.appendChild(input);
            input.focus();
            // Abrir picker inmediatamente en navegadores que lo soportan
            try { input.showPicker(); } catch (_) {}

            const commit = () => {
                const val = input.value; // YYYY-MM-DD o ''
                if (val) {
                    // Buscar el índice más cercano a la fecha elegida
                    const target = new Date(val).getTime();
                    let bestIdx = this._currentMin;
                    let bestDiff = Infinity;
                    for (let i = this.options.minValue; i <= this.options.maxValue; i++) {
                        const d = this._dates[i];
                        if (!d || d.startsWith('Fecha')) continue;
                        const diff = Math.abs(new Date(d).getTime() - target);
                        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
                    }
                    const lo = this.options.minValue;
                    const gap = this.options.minGap;
                    this._currentMin = Math.max(lo, Math.min(bestIdx, this._currentMax - gap));
                }
                this._applyValues(true);
            };

            input.addEventListener('change', () => { commit(); });
            input.addEventListener('blur',   () => { commit(); });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { input.blur(); }
                if (e.key === 'Escape') { this._applyValues(false); } // restaura sin cambiar
            });
        });
    },

    _updateMarkers: function (startValue, endValue) {
        var map = this.options.map;
        var fg  = L.featureGroup();
        var hide = function (m) {
            if (!m) return;
            if (m._parentGroup && typeof m._parentGroup.hasLayer === 'function' && m._parentGroup.hasLayer(m)) {
                m._parentGroup.removeLayer(m);
            } else {
                map.removeLayer(m);
            }
        };
        var show = function (m) {
            if (!m) return;
            if (m._parentGroup && typeof m._parentGroup.hasLayer === 'function' && !m._parentGroup.hasLayer(m)) {
                m._parentGroup.addLayer(m);
            } else if (!m._parentGroup) {
                map.addLayer(m);
            }
        };
        for (var i = this.options.minValue; i <= this.options.maxValue; i++) {
            hide(this.options.markers[i]);
        }
        for (i = startValue; i <= endValue; i++) {
            var m = this.options.markers[i];
            if (m) {
                show(m);
                fg.addLayer(m);
            }
        }
        if (this.options.rezoom) {
            map.fitBounds(fg.getBounds(), { maxZoom: this.options.rezoom });
        }
    },

    startSlider: function () {
        const lo  = this.options.minValue;
        const hi  = this.options.maxValue;
        const gap = this.options.minGap;

        // Restaurar desde localStorage clampeando siempre al rango actual
        const savedMin = localStorage.getItem('sliderRangeMin');
        const savedMax = localStorage.getItem('sliderRangeMax');

        if (savedMin !== null && savedMax !== null) {
            let rMin = Math.max(lo, Math.min(parseInt(savedMin), hi - gap));
            let rMax = Math.min(hi, Math.max(parseInt(savedMax), lo + gap));
            if (rMax - rMin < gap) { rMin = lo; rMax = hi; }
            this._currentMin = rMin;
            this._currentMax = rMax;
        } else if (this.options.showAllOnStart) {
            this._currentMin = lo;
            this._currentMax = hi;
        } else {
            this._currentMin = lo;
            this._currentMax = Math.floor((hi - lo) / 2) + lo;
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
