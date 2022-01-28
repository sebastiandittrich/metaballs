"use strict";

interface Coordinates  {
    x: number
    y: number
}

function generatePointMap({ shape, gap, width, height }: { gap: number, width: number, height: number, shape: (c: Coordinates) => boolean }) {
    const points = new Map<number, Map<number, boolean>>()
    for (let x = 0; x < width; x += gap) {
        points.set(x, new Map())
        for(let y = 0; y < height; y+= gap) {
            points.get(x).set(y, shape({x, y}))
        }
    }
    return points
}
function generateCellMap({ shape, gap, width, height }: { gap: number, width: number, height: number, shape: (x: number, y: number) => boolean }) {
    const cells = new Map<number, Map<number, number>>()
    for (let x = gap; x < width; x += gap) {
        for(let y = gap; y < height; y+= gap) {
            if(shape(x, y)) {
                const gaprow = (cells.has(x-gap) ? cells : cells.set(x-gap, new Map())).get(x-gap)
                gaprow.set(y-gap, (gaprow.get(y-gap) || 0) | 1)
                gaprow.set(y, (gaprow.get(y) || 0) | 4)
                const row = (cells.has(x) ? cells : cells.set(x, new Map())).get(x)
                row.set(y-gap, (row.get(y-gap) || 0) | 2)
                row.set(y, (row.get(y) || 0) | 8)
            }
        }
    }
    return cells
}

class Metaball {
    constructor(public metaverse: Metaverse, public coordinates: {x: number, y: number}, public radius: number, public velocity: { x: number, y: number }) {
        metaverse.balls.push(this)
    }
    renderString() {
        return `(${this.radius**2} / ( (x-${Math.floor(this.coordinates.x)})**2 + (y-${Math.floor(this.coordinates.y)})**2) )`
    }
    move(dt: number) {
        dt = dt/1000 // From ms to s

        this.velocity.x += this.metaverse.gravity.x * dt
        this.velocity.y += this.metaverse.gravity.y * dt

        this.coordinates.x += this.velocity.x * dt
        this.coordinates.y += this.velocity.y * dt

        if(this.coordinates.y + this.radius > this.metaverse.height || this.coordinates.y - this.radius < 0) {
            this.velocity.y =- this.velocity.y
            this.coordinates.y = Math.min(Math.max(this.coordinates.y, this.radius), this.metaverse.height - this.radius)
        }
        if(this.coordinates.x + this.radius > this.metaverse.height || this.coordinates.x - this.radius < 0) {
            this.velocity.x =- this.velocity.x
            this.coordinates.x = Math.min(Math.max(this.coordinates.x, this.radius), this.metaverse.width - this.radius)
        }

    }
}

class Metaverse {
    public balls: Metaball[] = []
    public ctx = this.el.getContext('2d')
    public gravity: Coordinates
    public width: number
    public height: number
    public resolution: number
    constructor(public el: HTMLCanvasElement, { width, height, resoultion = 1, gravity = {y: 0, x: 0} }: { width: number, height: number, resoultion?: number, gravity?: Coordinates }) {
        this.el.height = this.height = height
        this.el.width = this.width = width
        this.resolution = resoultion
        this.gravity = gravity
    }

    move(dt: number) {
        for(const ball of this.balls) {
            ball.move(dt)
        }
    }

    paint() {
        this.ctx.clearRect(0, 0, this.el.width, this.el.height)

        const shape = new Function('x', 'y', `return (${this.balls.map((ball) => ball.renderString()).join('+')}) > 1`) as (x: number, y: number) => boolean

        this.paintContour(shape, this.resolution)
    }

    paintPoints(shape: (c: Coordinates) => boolean, gap) {
        const points = generatePointMap({ shape, gap, width: this.el.width, height: this.el.height })

        for (const x of points.keys()) {
            for(const [y, result] of points.get(x)) {
                this.ctx.fillStyle = result ? 'green' : 'blue'
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, 2 * Math.PI, true);
                this.ctx.fill();
                this.ctx.closePath()
            }
        }
    }

    paintContour(shape: (x: number, y: number) => boolean, gap: number) {
        if(!window.generateTime) window.generateTime = 0
        const start = new Date().getTime()
        const cells = generateCellMap({ shape, gap, width: this.el.width, height: this.el.height })
        window.generateTime += new Date().getTime() - start
        if(iterations % (chunksize-1) == 0) {
            console.log(`Average generate time: ${window.generateTime / chunksize}ms`)
            window.generateTime = 0
        }

        // console.timeEnd('generate')
        // console.time('paint')
        this.ctx.strokeStyle = 'green'
        this.ctx.beginPath()
        for (const [x, row] of cells.entries()) {
            for(const [y, mask] of row.entries()) {
                if(mask == 0b1000 || mask == 0b0111) {
                    this.ctx.moveTo(x, y+(gap/2))
                    this.ctx.lineTo(x+(gap/2), y)
                } else if(mask == 0b0001 || mask == 0b1110) {
                    this.ctx.moveTo(x+gap, y+(gap/2))
                    this.ctx.lineTo(x+(gap/2), y+gap)
                } else if(mask == 0b0010 || mask == 0b1101) {
                    this.ctx.moveTo(x, y+(gap/2))
                    this.ctx.lineTo(x+(gap/2), y+gap)
                } else if(mask == 0b0100 || mask == 0b1011) {
                    this.ctx.moveTo(x+(gap/2), y)
                    this.ctx.lineTo(x+gap, y+(gap/2))
                } else if(mask == 0b0101 || mask == 0b1010) {
                    this.ctx.moveTo(x+(gap/2), y)
                    this.ctx.lineTo(x+(gap/2), y+gap)
                } else if(mask == 0b1100 || mask == 0b0011) {
                    this.ctx.moveTo(x, y+(gap/2))
                    this.ctx.lineTo(x+gap, y+(gap/2))
                }
            }
        }
        this.ctx.stroke()
        this.ctx.closePath()
        // console.timeEnd('paint')
    }
}

const metaverse = new Metaverse(document.getElementById("canvas") as HTMLCanvasElement, {
    width: 500,
    height: 500,
})

new Metaball(metaverse, {x: 100, y: 100}, 40, {x: 40, y: 100})
new Metaball(metaverse, {x: 100, y: 100}, 30, {x: 6, y: 20})
new Metaball(metaverse, {x: 100, y: 100}, 15, {x: 60, y: 28})
new Metaball(metaverse, {x: 100, y: 100}, 10, {x: 40, y: 20})
new Metaball(metaverse, {x: 100, y: 100}, 23, {x: 6, y: 50})
new Metaball(metaverse, {x: 100, y: 100}, 17, {x: 60, y: 100})
new Metaball(metaverse, {x: 100, y: 100}, 60, {x: 60, y: 20})
const steering = new Metaball(metaverse, {x: 400, y: 400}, 30, {x: 0, y: 0}, { x: 0, y: 0 })


metaverse.el.addEventListener('mousemove', e => {
    steering.coordinates.x = e.offsetX
    steering.coordinates.y = e.offsetY
})


let time = new Date().getTime()
let iterations = 0
let chunksize = 40
let lastPaint = new Date().getTime()
const fpsel = document.getElementById('fps')
const frametimes: number[] = []
setInterval(() => {
    const now = new Date().getTime()

    // Calc FPS
    frametimes.push(now)
    if(iterations >= chunksize) {
        const last = frametimes.shift()
        if(iterations % 5 == 0) {
            const fps = Math.floor((chunksize/(now - last))*1000)
            fpsel.innerText = `${fps} FPS`
        }
    }

    const dt = now - lastPaint
    lastPaint = now
    metaverse.move(dt)
    metaverse.paint()
    iterations++
})
