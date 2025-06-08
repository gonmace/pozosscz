L.Control.SliderControl = L.Control.extend({
    options: {
        position: 'topright',
        layers: null,
        timeAttribute: 'time',
        isEpoch: false,     // whether the time attribute is seconds elapsed from epoch
        startTimeIdx: 0,    // where to start looking for a timestring
        timeStrLength: 19,  // the size of  yyyy-mm-dd hh:mm:ss - if millis are present this will be larger
        maxValue: -1,
        minValue: 0,
        showAllOnStart: false,
        markers: null,
        range: false,
        follow: false,
        sameDate: false,
        alwaysShowDate : false,
        rezoom: null
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._layer = this.options.layer;
    },

    extractTimestamp: function(time, options) {
        if (options.isEpoch) {
            time = (new Date(parseInt(time))).toString(); // this is local time
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

        // Create a control sliderContainer with a jquery ui slider
        var sliderContainer = L.DomUtil.create('div', 'slider', this._container);
        $(sliderContainer).append('<div id="leaflet-slider" style="width:200px"><div class="ui-slider-handle"></div><div id="slider-timestamp" style="width:200px; margin-top:13px; background-color:#FFFFFF; text-align:center; border-radius:5px;"></div></div>');
        //Prevent map panning/zooming while using the slider
        $(sliderContainer).mousedown(function () {
            map.dragging.disable();
        });
        $(document).mouseup(function () {
            map.dragging.enable();
            //Hide the slider timestamp if not range and option alwaysShowDate is set on false
            if (this.options.range || !this.options.alwaysShowDate) {
                $('#slider-timestamp').html('');
            }
        }.bind(this));

        var options = this.options;
        this.options.markers = [];

        //If a layer has been provided: calculate the min and max values for the slider
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
        return sliderContainer;
    },

    onRemove: function (map) {
        //Delete all markers which where added via the slider and remove the slider div
        for (var i = this.options.minValue; i <= this.options.maxValue; i++) {
            map.removeLayer(this.options.markers[i]);
        }
        $('#leaflet-slider').remove();

        // unbind listeners to prevent memory leaks
        $(document).off("mouseup");
        $(".slider").off("mousedown");
    },

    startSlider: function () {
        var options = this.options;
        var extractTimestamp = this.extractTimestamp;
        var index_start = options.minValue;
        if(options.showAllOnStart){
            index_start = options.maxValue;
            if(options.range) options.values = [options.minValue,options.maxValue];
            else options.value = options.maxValue;
        }
        $("#leaflet-slider").slider({
            range: options.range,
            value: options.value,
            values: options.values,
            min: options.minValue,
            max: options.maxValue,
            sameDate: options.sameDate,
            step: 1,
            slide: function (e, ui) {
                var map = options.map;
                var fg = L.featureGroup();
                if(!!options.markers[ui.value]) {
                    // If there is no time property, this line has to be removed (or exchanged with a different property)
                    if(options.markers[ui.value].feature !== undefined) {
                        if(options.markers[ui.value].feature.properties[options.timeAttribute]){
                            if(options.markers[ui.value]) $('#slider-timestamp').html(
                                extractTimestamp(options.markers[ui.value].feature.properties[options.timeAttribute], options));
                        }else {
                            console.error("Time property "+ options.timeAttribute +" not found in data");
                        }
                    }else {
                        // set by leaflet Vector Layers
                        if(options.markers[ui.value].options[options.timeAttribute]){
                            if(options.markers[ui.value]) $('#slider-timestamp').html(
                                extractTimestamp(options.markers[ui.value].options[options.timeAttribute], options));
                        }else {
                            console.error("Time property "+ options.timeAttribute +" not found in data");
                        }
                    }

                    var i;
                    // clear markers
                    for (i = options.minValue; i <= options.maxValue; i++) {
                        if(options.markers[i]) map.removeLayer(options.markers[i]);
                    }
                    if(options.range){
                        // jquery ui using range
                        for (i = ui.values[0]; i <= ui.values[1]; i++){
                           if(options.markers[i]) {
                               map.addLayer(options.markers[i]);
                               fg.addLayer(options.markers[i]);
                           }
                        }
                    }else if(options.follow){
                        for (i = ui.value - options.follow + 1; i <= ui.value ; i++) {
                            if(options.markers[i]) {
                                map.addLayer(options.markers[i]);
                                fg.addLayer(options.markers[i]);
                            }
                        }
                    }else if(options.sameDate){
                        var currentTime;
                        if (options.markers[ui.value].feature !== undefined) {
                            currentTime = options.markers[ui.value].feature.properties.time;
                        } else {
                            currentTime = options.markers[ui.value].options.time;
                        }
                        for (i = options.minValue; i <= options.maxValue; i++) {
                            if(options.markers[i].options.time == currentTime) map.addLayer(options.markers[i]);
                        }
                    }else{
                        for (i = options.minValue; i <= ui.value ; i++) {
                            if(options.markers[i]) {
                                map.addLayer(options.markers[i]);
                                fg.addLayer(options.markers[i]);
                            }
                        }
                    }
                }
                if(options.rezoom) {
                    map.fitBounds(fg.getBounds(), {
                        maxZoom: options.rezoom
                    });
                }
            }
        });
        if (!options.range && options.alwaysShowDate) {
            $('#slider-timestamp').html(extractTimestamp(options.markers[index_start].options[options.timeAttribute], options));
        }
        for (var i = options.minValue; i <= index_start; i++) {
            options.map.addLayer(options.markers[i]);
        }
    }
});

L.control.sliderControl = function (options) {
    return new L.Control.SliderControl(options);
};