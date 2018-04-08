class Robot {
    constructor(id, wave){
        l("New Robot", id)

        this.id = id;
        this.wave = wave
        this.frequency = 1;
        this.amplitude = 1;
        this.offset = 0;
    }
}

module.exports = Robot