
export class RandomGenerator {
    private x = 123456789
    private y = 362436069
    private z = 521288629
    private w: number
    
    public constructor(seed: number) {
        this.w = seed
    }
    
    /// [0, 1)
    next(): number {
        let t = this.x ^ (this.x << 11)
        this.x = this.y
        this.y = this.z
        this.z = this.w
        this.w = (this.w ^ (this.w >> 19)) ^ (t ^ (t >> 8))
        return this.w / 0x7FFFFFFF
    }

    bool = () => this.next() >= 0.5
    int32 = (min: number, max: number) => Math.floor(this.next() * (max + 1 - min) + min)
    oneOf = <T>(array: T[]) => array[this.int32(0, array.length - 1)]
}
