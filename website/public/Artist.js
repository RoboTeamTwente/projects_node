class Artist {
    constructor(canvasId = "myCanvas"){

        this.canvas = document.getElementById(canvasId);
        this.WIDTH = this.canvas.width;
        this.HEIGHT= this.canvas.height;

        this.RANGE = 10;

        this.Y_STEP = this.HEIGHT / (this.RANGE*2);

        this.ctx = this.canvas.getContext("2d");

        console.log(this.WIDTH, this.HEIGHT);

        this.drawGrid();

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
            this.ctx.moveTo(step * i    , center - serie[i]  * this.Y_STEP);
            this.ctx.lineTo(step * (i+1), center - serie[i+1]* this.Y_STEP);
            this.ctx.stroke();


        }
    }

    drawGrid(){
        this.ctx.strokeStyle="#eee";
        this.ctx.beginPath();
        for(let dy = 0; dy < this.RANGE * 2; dy++){
            this.ctx.moveTo(0, dy * this.Y_STEP);
            this.ctx.lineTo(this.WIDTH, dy * this.Y_STEP);
        }
        this.ctx.stroke();

        this.ctx.strokeStyle="black";
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.HEIGHT / 2);
        this.ctx.lineTo(this.WIDTH, this.HEIGHT / 2);
        this.ctx.stroke();
    }
}