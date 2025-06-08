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
        minGap: 1 // Mínima diferencia entre los rangos
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._layer = this.options.layer;
    },

    extractTimestamp: function(time, options) {
        if (options.isEpoch) {
            time = (new Date(parseInt(time))).toString();
        }
        return time.substr(options.startTimeIdx, options.startTimeIdx + options.timeStrLength);
    },

    setPosition: function (position) {
        var map = this._map;

        if (map) {
            map.removeControl(this);
        }

        this.options.position = position;

        if (map) {
            map.addControl(this);
        }
        this.startSlider();
        return this;
    },

    onAdd: function (map) {
        this.options.map = map;

        // Create a control sliderContainer with custom range input
        var sliderContainer = L.DomUtil.create('div', 'slider', this._container);
        var sliderContent = `
            <div id="leaflet-slider" class="bg-gray-100 w-full max-w-xs px-4 py-1 rounded-lg shadow-lg">
                <div id="slider-timestamp" class="text-lg font-bold mb-4 hidden"></div>
                
                <div class="relative mt-4 slider-container">
                    <!-- Custom Range Inputs -->
                    <input type="range" id="rangeMin" class="range-input">
                    <input type="range" id="rangeMax" class="range-input">
                    
                    <!-- Custom Track -->
                    <div class="relative w-full h-2 rounded-md">
                        <div id="rangeTrack" class="absolute h-2 bg-accent rounded-md"></div>
                    </div>
                </div>
                
                <div class="flex justify-between mt-1 text-black text-xs">
                    <span id="startDate"></span>
                    <span id="endDate"></span>
                </div>
            </div>`;
        sliderContainer.innerHTML = sliderContent;

        // Get elements
        this._rangeMin = sliderContainer.querySelector('#rangeMin');
        this._rangeMax = sliderContainer.querySelector('#rangeMax');
        this._rangeTrack = sliderContainer.querySelector('#rangeTrack');
        this._startDateSpan = sliderContainer.querySelector('#startDate');
        this._endDateSpan = sliderContainer.querySelector('#endDate');
        this._timestampDiv = sliderContainer.querySelector('#slider-timestamp');

        // Prevent map panning/zooming while using the slider
        sliderContainer.addEventListener('mousedown', () => {
            map.dragging.disable();
        });

        document.addEventListener('mouseup', () => {
            map.dragging.enable();
        });

        // Initialize markers array
        var options = this.options;
        this.options.markers = [];

        if (this._layer) {
            var index_temp = 0;
            this._layer.eachLayer(function (layer) {
                options.markers[index_temp] = layer;
                ++index_temp;
            });
            options.maxValue = index_temp - 1;
            this.options = options;
        } else {
            console.log("Error: You have to specify a layer via new SliderControl({layer: your_layer});");
        }

        // Add styles for the range inputs
        const style = document.createElement('style');
        style.textContent = `
            .slider {
                margin: 0.5rem;
                min-width: 280px;
            }

            .slider-container {
                position: relative;
                height: 18px;
            }

            /* Hide default range styling */
            .range-input {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                position: absolute;
                background: transparent;
                pointer-events: none;
                z-index: 2;
                color: red; /* Hide the value */
            }

            /* Custom track (hidden default) */
            .range-input::-webkit-slider-runnable-track {
                height: 2px;
            }

            /* Custom thumb styling (Centered) */
            .range-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                background: gray;
                border: 3px solid hsl(var(--p));
                border-radius: 50%;
                cursor: pointer;
                pointer-events: auto;
                position: relative;
                z-index: 3;
                transform: translateY(-30%);
            }

            .range-input::-moz-range-thumb {
                width: 18px;
                height: 18px;
                background: gray;
                border: 3px solid hsl(var(--p));
                border-radius: 50%;
                cursor: pointer;
                pointer-events: auto;
                z-index: 3;
                transform: translateY(-30%);
            }
        `;
        document.head.appendChild(style);

        return sliderContainer;
    },

    onRemove: function (map) {
        for (var i = this.options.minValue; i <= this.options.maxValue; i++) {
            map.removeLayer(this.options.markers[i]);
        }
        
        document.removeEventListener('mouseup', this._handleMouseUp);
        this._rangeMin.removeEventListener('input', this._handleMinInput);
        this._rangeMax.removeEventListener('input', this._handleMaxInput);
    },

    _updateRange: function(event) {
        let min = parseInt(this._rangeMin.value);
        let max = parseInt(this._rangeMax.value);

        // Ensure min & max have a gap of at least minGap
        if (max - min < this.options.minGap) {
            if (event && event.target === this._rangeMin) {
                min = max - this.options.minGap;
                this._rangeMin.value = min;
            } else {
                max = min + this.options.minGap;
                this._rangeMax.value = max;
            }
        }

        // Save range values to localStorage
        localStorage.setItem('sliderRangeMin', min);
        localStorage.setItem('sliderRangeMax', max);

        // Update visual track
        const range = this.options.maxValue - this.options.minValue;
        const minPercent = ((min - this.options.minValue) / range) * 100;
        const maxPercent = ((max - this.options.minValue) / range) * 100;
        
        requestAnimationFrame(() => {
            this._rangeTrack.style.left = minPercent + "%";
            this._rangeTrack.style.right = (100 - maxPercent) + "%";
        });

        // Update dates and markers
        const startDate = this._updateTimestamp(this.options.markers[min]);
        const endDate = this._updateTimestamp(this.options.markers[max]);
        
        if (startDate && endDate) {
            const startDateShort = startDate.split(' ')[0];
            const endDateShort = endDate.split(' ')[0];
            this._startDateSpan.textContent = startDateShort;
            this._endDateSpan.textContent = endDateShort;
            this._timestampDiv.innerHTML = `${startDate} - ${endDate}`;
        }

        this._updateMarkers(min, max);
    },

    _updateTimestamp: function(marker) {
        if (!marker) return;
        
        let timeValue;
        if (marker.feature !== undefined && marker.feature.properties[this.options.timeAttribute]) {
            timeValue = marker.feature.properties[this.options.timeAttribute];
        } else if (marker.options[this.options.timeAttribute]) {
            timeValue = marker.options[this.options.timeAttribute];
        } else {
            console.error("Time property " + this.options.timeAttribute + " not found in data");
            return;
        }
        
        return this.extractTimestamp(timeValue, this.options);
    },

    _updateMarkers: function(startValue, endValue) {
        var map = this.options.map;
        var fg = L.featureGroup();
        
        // Clear existing markers
        for (var i = this.options.minValue; i <= this.options.maxValue; i++) {
            if(this.options.markers[i]) map.removeLayer(this.options.markers[i]);
        }

        // Add markers based on range
        for (i = startValue; i <= endValue; i++) {
            if(this.options.markers[i]) {
                map.addLayer(this.options.markers[i]);
                fg.addLayer(this.options.markers[i]);
            }
        }

        if(this.options.rezoom) {
            map.fitBounds(fg.getBounds(), {
                maxZoom: this.options.rezoom
            });
        }
    },

    startSlider: function () {
        // Setup initial values
        this._rangeMin.min = this.options.minValue;
        this._rangeMin.max = this.options.maxValue;
        this._rangeMax.min = this.options.minValue;
        this._rangeMax.max = this.options.maxValue;

        // Try to get saved values from localStorage
        const savedMin = localStorage.getItem('sliderRangeMin');
        const savedMax = localStorage.getItem('sliderRangeMax');

        if(savedMin !== null && savedMax !== null) {
            // Use saved values if they exist and are within valid range
            const minValue = parseInt(savedMin);
            const maxValue = parseInt(savedMax);
            
            if (minValue >= this.options.minValue && 
                maxValue <= this.options.maxValue && 
                maxValue - minValue >= this.options.minGap) {
                this._rangeMin.value = minValue;
                this._rangeMax.value = maxValue;
            } else {
                // If saved values are invalid, use default values
                if(this.options.showAllOnStart) {
                    this._rangeMin.value = this.options.minValue;
                    this._rangeMax.value = this.options.maxValue;
                } else {
                    this._rangeMin.value = this.options.minValue;
                    this._rangeMax.value = Math.floor((this.options.maxValue - this.options.minValue) / 2);
                }
            }
        } else {
            // If no saved values exist, use default values
            if(this.options.showAllOnStart) {
                this._rangeMin.value = this.options.minValue;
                this._rangeMax.value = this.options.maxValue;
            } else {
                this._rangeMin.value = this.options.minValue;
                this._rangeMax.value = Math.floor((this.options.maxValue - this.options.minValue) / 2);
            }
        }

        // Bind event handlers
        this._rangeMin.addEventListener('input', (e) => this._updateRange(e));
        this._rangeMax.addEventListener('input', (e) => this._updateRange(e));

        // Initial update
        this._updateRange();
    }
});

L.control.sliderControl = function (options) {
    return new L.Control.SliderControl(options);
};