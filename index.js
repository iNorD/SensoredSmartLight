/*** SensoredSmartLight Z-Way Home Automation module *************************************

 Version: 1.1.0

 -----------------------------------------------------------------------------
 Author: Egor Eremeev
 Description: In the daytime the light turns on some level
 ******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function SensoredSmartLight(id, controller) {
    // Call superconstructor first (AutomationModule)
    SensoredSmartLight.super_.call(this, id, controller);

    // by default dimmer button status not pressed
    this.dimmerButtonStatus = 0;

    // Create instance variables
    this.timerAutoOff = null;
};

inherits(SensoredSmartLight, AutomationModule);
_module = SensoredSmartLight;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------
SensoredSmartLight.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    SensoredSmartLight.super_.prototype.init.call(this, config);

    var self = this;

    // Dimmer levels for day and night
    var morningLevelLux = this.config.Level.MorningLevel;
    var dayLevelLux = this.config.Level.DayLevel;
    var nightLevelLux = this.config.Level.NightLevel;


    // Morning start
    var morningStartTime_arr = this.config.Morning.MorningTimeStart.split(":").map(function (x) {
        return parseInt(x, 10);
    });
    this.morningStartTime = morningStartTime_arr[0] * 60 + morningStartTime_arr[1];
    // Morning end
    var morningEndTime_arr = this.config.Morning.MorningTimeEnd.split(":").map(function (x) {
        return parseInt(x, 10);
    });
    this.morningEndTime = morningEndTime_arr[0] * 60 + morningEndTime_arr[1];
    // Day start
    var dayStartTime_arr = this.config.Day.DayTimeStart.split(":").map(function (x) {
        return parseInt(x, 10);
    });
    this.dayStartTime = dayStartTime_arr[0] * 60 + dayStartTime_arr[1];
    // Day end
    var dayEndTime_arr = this.config.Day.DayTimeEnd.split(":").map(function (x) {
        return parseInt(x, 10);
    });
    this.dayEndTime = dayEndTime_arr[0] * 60 + dayEndTime_arr[1];

    // handler for Sensor
    this.sensorTriggered = function (Sensor) {
        // Now Time in minutes
        var nowDate = new Date();
        var nowTime = nowDate.getHours() * 60 + nowDate.getMinutes();

        // Check Motion Sensor
        if (Sensor.get("metrics:level") == "on") {

            //Максимум люкс, которые выдает лампочка
            var lightbulbLumens = this.config.RoomParams.LightbulbLumens;
            var roomArea = this.config.RoomParams.RoomArea;
            //var maxBulbLux = lightbulbLumens / roomArea;
            var maxBulbLux = 40;


            //Нужный уровень лампочки в процентах
            var neededLevel = 0;

            //var currentLuminosityLevelLux = self.controller.devices.get(self.config.LuminositySensor).get("metrics:level");
            var currentLuminosityLevelLux = 40;
            var neededLevelLux;


            //MORNING TIME
            if (nowTime >= self.morningStartTime && nowTime <= self.morningEndTime) {
                neededLevelLux = morningLevelLux;
            }
            //DAY TIME
            else if (nowTime >= self.dayStartTime && nowTime <= self.dayEndTime) {
                neededLevelLux = dayLevelLux;
            }
            //NIGHT TIME
            else {
                neededLevelLux = nightLevelLux;
            }

            var diffreneceInLux = neededLevelLux - currentLuminosityLevelLux;
            if (diffreneceInLux > 0) {
                neededLevel = (diffreneceInLux * 100) / maxBulbLux;
            }

            self.controller.devices.get(self.config.Dimmer).performCommand("exact", {level: neededLevel});
            self.controller.devices.get(self.config.Dimmer).performCommand("on");

            //AutoOff
            // If timeout setted, start timer autooff
            if (self.config.timeout !== 0 && typeof self.config.timeout !== 'undefined') {
                if (self.timerAutoOff) {
                    // Timer is set, so we destroy it
                    clearTimeout(self.timerAutoOff);
                }
                self.timerAutoOff = setTimeout(function () {
                    // Timeout fired, so we send "off" command to the virtual device
                    self.controller.devices.get(self.config.Dimmer).performCommand("off");
                    // And clearing out this.timer variable
                    self.timerAutoOff = null;
                }, self.config.timeout * 1000);
            }

        }

    };

    // handler for Dimmer Light
    this.dimmerLevelChanged = function (Dimmer) {
        // when light off, dimmer button status not pressed
        if (self.controller.devices.get(self.config.Dimmer).get("metrics:level") === 0) {
            self.dimmerButtonStatus = 0;
        }
    };


    // Setup metric update event listener
    this.controller.devices.on(this.config.MotionSensor, 'change:metrics:level', this.sensorTriggered);
    this.controller.devices.on(this.config.Dimmer, 'change:metrics:level', this.dimmerLevelChanged);
};

SensoredSmartLight.prototype.stop = function () {
    SensoredSmartLight.super_.prototype.stop.call(this);

    if (this.timerAutoOff) {
        clearTimeout(this.timerAutoOff);
    }

    this.controller.devices.off(this.config.MotionSensor, 'change:metrics:level', this.sensorTriggered);
    this.controller.devices.off(this.config.Dimmer, 'change:metrics:level', this.dimmerLevelChanged);


};
