const _ = require('lodash')

class WaveManager {
    constructor(cb, Hz=20){
        this.cb = cb;
        this.Hz = Hz;

        this.waves = [];
        this.running = false;
        this.iTick = 0;

        setInterval(() => this.tick(), 1000/Hz)

        this.last = Date.now()
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
    continue(){
        console.log("[WaveManager] Continuing WaveManager");
        this.running = true;
    }

    getStatus(){
        return {
            running : this.running
        }
    }

    addWave(wave, i=this.waves.length){
        this.waves[i] = wave;
        wave.setHz(this.Hz)
    }

    getWavesSettings(){
        return _.map(this.waves, wave => wave.getSettings())
    }

    tick(){
        if(!this.running)
            return;

        this.iTick++;
        this.cb(_.map(this.waves, wave => wave.tick(this.iTick)));

        let now = Date.now()
        // l("Duration : " + (now - this.last))
        this.last = now
    }

}

class Wave {
    constructor(id, waveName="Constant", frequency=1000, amplitude=1, offset=0){
        console.log("New Wave", {id, wave : waveName, frequency, amplitude, offset});

        this.id = id;
        this.waveName = waveName;
        this.wave = nameToWave[waveName];
        this.frequency = frequency;
        this.amplitude = amplitude;
        this.offset = offset;

        this.setHz(this.frequency);

        this.nTicks = 0;
    }

    setHz(Hz){
        this.Hz = this.frequency / (1000 / Hz);
    }

    tick(t = this.nTicks){

        let period = (t % this.Hz) / this.Hz;

        this.nTicks++;

        return this.wave(period) * this.amplitude + this.offset;
    }

    getSettings(){
        return {
            id : this.id,
            wave : this.waveName,
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