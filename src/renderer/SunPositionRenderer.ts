import {SvgUtil} from "./SvgUtil";
import {Coordinate} from "./Coordinate";
import {CircleCoordinate} from "./CircleCoordinate";
import SVG, {Svg} from "@svgdotjs/svg.js";
import {CardConfigWrapper} from "../config/CardConfigWrapper";
import {DimensionCalculator} from "../dimensions/DimensionCalculator";

export class SunPositionRenderer {

    private config: CardConfigWrapper;
    private readonly dimensionCalculator: DimensionCalculator;
    private svgUtil!: SvgUtil;

    private markerElement: SVG.Circle | undefined = undefined;

    private readonly roseCenter: Coordinate;

    constructor(config: CardConfigWrapper, dimensionCalculator: DimensionCalculator, svg: Svg) {
        this.config = config;
        this.dimensionCalculator = dimensionCalculator;
        this.svgUtil = new SvgUtil(svg);
        this.roseCenter = this.dimensionCalculator.roseCenter();
    }

    drawSunPosition(sunDegrees: number | undefined): void {
        if (this.markerElement === undefined) {
            this.drawMarker();
        }
        if (sunDegrees === undefined) {
            this.markerElement!.attr({visibility: "hidden"});
        } else {
            this.markerElement!.attr({visibility: "visible"});
            this.markerElement!.animate(700, 0, 'now')
                .transform({rotate: sunDegrees, originX: this.roseCenter.x, originY: this.roseCenter.y})
                .ease('<>');
        }
    }

    moveToFront() {
        this.markerElement?.front();
    }

    private drawMarker() {
        const markerCenter = new Coordinate(this.roseCenter.x, this.roseCenter.y - this.dimensionCalculator.roseRadius - 1);
        this.markerElement = this.svgUtil.drawCircle(new CircleCoordinate(markerCenter, this.config.sunPosition.arrowSize / 2));
        this.markerElement.attr({
            stroke: this.config.sunPosition.color,
            fill: this.config.sunPosition.color
        });
        this.markerElement.attr({visibility: "hidden"});
    }
}
