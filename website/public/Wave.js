class Wave {
    constructor(id, wave="SineWave"){

        this.id = id;
        this.wave = wave;
        this.frequency = 1;
        this.amplitude = 1;
        this.offset = 0;

        this.val = 0;
    }

    setVal(val){
        this.val = val;
    }

    getVal(){
        return this.val
    }

    getSettings(){
        return {
            id: this.id,
            wave: this.wave,
            frequency: this.frequency,
            amplitude: this.amplitude,
            offset: this.offset
        }
    }
}
