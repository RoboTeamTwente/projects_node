const _ = require('lodash')

class WaveManager {
    constructor(cb, Hz=20){
        this.cb = cb;
        this.Hz = Hz;

        this.waves = [];
        this.running = false;
        this.iTick = 0;

        setInterval(() => this.tick(), 1000/Hz)
    }

    stop(){
        console.log("[WaveManager] Stopping WaveManager");
        this.running = false;
    }
    start(){
        console.log("[WaveManager] Starting WaveManager");
        this.iTick = 0;
        this.running = true;
    }

    getState(){
        console.log("[WaveManager] Returning state");
        return {
            running : this.running,
            waves : this.getWavesSettings()
        }
    }

    addWave(waveSettings, i=this.waves.length){
        console.log("[WaveManager] Adding wave : " + waveSettings.wave);
        this.waves[i] = new Wave(waveSettings);
        this.waves[i].setHz(this.Hz)
    }

    removeWaves(){
        console.log("[WaveManager] Removing waves");
        this.stop();
        this.waves = []
    }

    getWavesSettings(){
        return _.map(this.waves, wave => wave.getSettings())
    }

    tick(){
        if(!this.running)
            return;

        this.iTick++;

        this.cb(_.map(this.waves, wave => wave.tick(this.iTick)));

    }

}

class Wave {
    constructor({
        wave = "Constant",
        frequency = 1000, 
        amplitude = 1, 
        offset = 0})
    {

        this.wave = wave;
        this._wave = nameToWave[wave];
        this.frequency = parseFloat(frequency);
        this.amplitude = parseFloat(amplitude);
        this.offset = parseFloat(offset);

        this.setHz(parseFloat(this.frequency));

        this.nTicks = 0;
    }

    setHz(Hz){
        this.Hz = this.frequency / (1000 / Hz);
    }

    tick(t = this.nTicks){

        let period = (t % this.Hz) / this.Hz;

        if(this.wave == "SawWave")
            console.log(period, this.offset);

        this.nTicks++;

        return this._wave(period) * this.amplitude + this.offset;
    }

    getSettings(){
        return {
            id : this.id,
            wave : this.wave,
            frequency : this.frequency,
            amplitude : this.amplitude,
            offset : this.offset
        }
    }
}

let Constant = x => 0;

let SineWave   = x => Math.sin(x * 2 * Math.PI);
let CosineWave = x => Math.cos(x * 2 * Math.PI);
let BlockWave  = x => x < 0.5 ? 0 : 1;
let SawWave    = x => x;

let SineWaveInverted   = x => -SineWave(x);
let CosineWaveInverted = x => -CosineWave(x);
let BlockWaveInverted  = x => 1 - BlockWave(x);
let SawWaveInverted    = x => 1 - SawWave(x);

let nameToWave = {
    "Constant"           : Constant,
    "SineWave"           : SineWave,
    "CosineWave"         : CosineWave,
    "BlockWave"          : BlockWave,
    "SawWave"            : SawWave,
    "SineWaveInverted"   : SineWaveInverted,
    "CosineWaveInverted" : CosineWaveInverted,
    "BlockWaveInverted"  : BlockWaveInverted,
    "SawWaveInverted"    : SawWaveInverted,
};

module.exports = {
    WaveManager,
    Wave,
    Waves : {
        Constant : "Constant",
        SineWave: "SineWave",
        CosineWave: "CosineWave",
        BlockWave: "BlockWave",
        SawWave: "SawWave",
        SineWaveInverted: "SineWaveInverted",
        CosineWaveInverted: "CosineWaveInverted",
        BlockWaveInverted: "BlockWaveInverted",
        SawWaveInverted: "SawWaveInverted"
    }
};