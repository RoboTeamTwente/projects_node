class Artist {
    constructor(canvasId = "myCanvas"){

        this.canvas = document.getElementById(canvasId);
        this.WIDTH = this.canvas.width;
        this.HEIGHT= this.canvas.height;

        this.RANGE = 10;

        this.STEP = this.HEIGHT / (this.RANGE*2);

        this.ctx = this.canvas.getContext("2d");

    }

    clear(){
        this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    }

    drawSeries(serie, colour="red"){
        let nEntries = serie.length;
        let step = this.WIDTH / (nEntries-1);
        let center = this.HEIGHT / 2;

        for(let i = 0; i < nEntries- 1; i++){

            let at = serie[i];
            let next = serie[i+1];

            this.ctx.strokeStyle=colour;
            this.ctx.beginPath();
            this.ctx.moveTo(step * i    , center - at   * this.STEP);
            this.ctx.lineTo(step * (i+1), center - next * this.STEP);
            this.ctx.stroke();

        }
    }

    drawCartesian(x, y, colour="red"){
        let centerX = this.WIDTH / 2;
        let centerY = this.HEIGHT / 2;

        this.ctx.strokeStyle = colour;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(centerX + x * this.STEP, centerY + y * this.STEP);
        this.ctx.stroke();

    }

    drawPolar(rho, theta, colour="red"){
        let x = rho * Math.cos(theta);
        let y = rho * Math.sin(theta);
        this.drawCartesian(x, y, colour)
    }

    drawGrid(polar=false){
        this.ctx.strokeStyle="#eee";
        this.ctx.beginPath();
        for(let dy = 0; dy < this.RANGE * 2; dy++){
            this.ctx.moveTo(0, dy * this.STEP);
            this.ctx.lineTo(this.WIDTH, dy * this.STEP);
        }
        this.ctx.stroke();

        if(polar){
            this.ctx.strokeStyle="#eee";
            this.ctx.beginPath();
            for(let dx = 0; dx < this.RANGE * 2; dx++){
                this.ctx.moveTo(dx * this.STEP, 0);
                this.ctx.lineTo(dx * this.STEP, this.HEIGHT);
            }
            this.ctx.stroke();
        }

        this.ctx.strokeStyle="black";
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.HEIGHT / 2);
        this.ctx.lineTo(this.WIDTH, this.HEIGHT / 2);
        this.ctx.stroke();

        if(polar){
            this.ctx.strokeStyle = "black";
            this.ctx.beginPath();
            this.ctx.moveTo(this.WIDTH / 2, 0);
            this.ctx.lineTo(this.WIDTH / 2, this.HEIGHT);
            this.ctx.stroke();
        }
    }
}