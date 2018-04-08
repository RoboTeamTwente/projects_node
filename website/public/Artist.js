class Artist {
    constructor(canvasId = "myCanvas"){

        this.canvas = document.getElementById(canvasId);
        this.WIDTH = this.canvas.width;
        this.HEIGHT= this.canvas.height;

        this.ctx = this.canvas.getContext("2d");

        console.log(this.WIDTH, this.HEIGHT)

        // ctx.strokeStyle="#fff";
        // ctx.moveTo(0, 0);
        // ctx.lineTo(c.width, c.height);
        // ctx.stroke();
        //
        // console.log(ctx)

        let series = [];
        for(let i = 0; i < 10; i++){
            series.push(Math.sin((Math.PI / 5) * i))
        }

        this.drawSeries(series)

    }

    drawSeries(serie){


        let nEntries = serie.length;
        let step = this.WIDTH / (nEntries-1);
        let center = this.HEIGHT / 2;


        for(let i = 0; i < nEntries- 1; i++){

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            let at = serie[i];
            let next = serie[i+1]

            this.ctx.strokeStyle="#fff";
            this.ctx.moveTo(step * i    , center - serie[i]  * 100);
            this.ctx.lineTo(step * (i+1), center - serie[i+1]* 100);
            this.ctx.stroke();


        }

    }
}