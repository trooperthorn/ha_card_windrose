import {SvgUtil} from "./SvgUtil";
import {Coordinate} from "./Coordinate";
import {TextAttributes} from "./TextAttributes";
import {EntityState} from "../entity-state-processing/EntityState";
import {CornerInfo} from "../config/CornerInfo";
import SVG, {Svg} from "@svgdotjs/svg.js";
import {WindSpeedConvertFunctionFactory} from "../converter/WindSpeedConvertFunctionFactory";
import {WindDirectionLettersConverter} from "../converter/WindDirectionLettersConverter";
import {CornersInfo} from "../config/CornersInfo";
import {DimensionCalculator} from "../dimensions/DimensionCalculator";

const UNKNOWN_STATES = ['unknown', 'unavailable'];

export class InfoCornersRenderer {

    private readonly dimensionCalculator: DimensionCalculator;
    private svgUtil!: SvgUtil;

    private leftTopCoor: Coordinate;
    private rightTopCoor: Coordinate;
    private rightBottomCoor: Coordinate;
    private leftBottomCoor: Coordinate;

    private leftTopConfig: CornerInfo;
    private rightTopConfig: CornerInfo;
    private leftBottomConfig: CornerInfo;
    private rightBottomConfig: CornerInfo;

    private leftTopValue!: SVG.Text;
    private rightTopValue!: SVG.Text;
    private leftBottomValue!: SVG.Text;
    private rightBottomValue!: SVG.Text;

    private leftTopConverter: (input: any) => any;
    private rightTopConverter: (input: any) => any;
    private leftBottomConverter: (input: any) => any;
    private rightBottomConverter: (input: any) => any;

    constructor(cornersInfo: CornersInfo, dimensionCalculator: DimensionCalculator, svg: Svg) {

        this.dimensionCalculator = dimensionCalculator;
        this.svgUtil = new SvgUtil(svg);

        this.leftTopCoor = this.dimensionCalculator.infoCornerLeftTop();
        this.rightTopCoor = this.dimensionCalculator.infoCornerRightTop();
        this.leftBottomCoor = this.dimensionCalculator.infoCornetLeftBottom();
        this.rightBottomCoor = this.dimensionCalculator.infoCornetRightBottom();

        this.leftTopConfig = cornersInfo.topLeftInfo;
        this.rightTopConfig = cornersInfo.topRightInfo;
        this.leftBottomConfig = cornersInfo.bottomLeftInfo;
        this.rightBottomConfig = cornersInfo.bottomRightInfo;

        const windConverterFactory = new WindSpeedConvertFunctionFactory();

        this.leftTopConverter = this.getConverterFunction(this.leftTopConfig, windConverterFactory);
        this.rightTopConverter = this.getConverterFunction(this.rightTopConfig, windConverterFactory);
        this.leftBottomConverter = this.getConverterFunction(this.leftBottomConfig, windConverterFactory);
        this.rightBottomConverter = this.getConverterFunction(this.rightBottomConfig, windConverterFactory);
    }

    private getConverterFunction(config: CornerInfo, windConverterfactory: WindSpeedConvertFunctionFactory): (input: any) => any | undefined {

        if (config.inputUnit && config.outputUnit) {
            if (config.inputUnit === 'degrees' && config.outputUnit === 'letters') {
                return WindDirectionLettersConverter.getConvertToLettersFunc(config.directionLetters!);
            } else if (config.inputUnit === 'letters' && config.outputUnit === 'degrees') {
                return WindDirectionLettersConverter.getConvertToDegreesFunc(config.directionLetters!);
            }
            return windConverterfactory.getConverterFunction(config.inputUnit, config.outputUnit) as (input: any) => any;
        }
       return (input: any) => { return input };
    }

    drawCornerLabel() {
        if (this.leftTopConfig.label) {
            const leftTop = this.svgUtil.drawText(this.dimensionCalculator.infoCornerLabelLeftTop(), this.leftTopConfig.label,
                TextAttributes.infoCornerLabelAttribute(this.leftTopConfig.color, this.leftTopConfig.labelTextSize));
            leftTop.attr({"text-anchor": "left", "dominant-baseline": "hanging"});
            leftTop.addClass("corner-label-left-top");
        }
        if (this.rightTopConfig.label) {
            const rightTop = this.svgUtil.drawText(this.dimensionCalculator.infoCornerLabelRightTop(), this.rightTopConfig.label,
                TextAttributes.infoCornerLabelAttribute(this.rightTopConfig.color, this.rightTopConfig.labelTextSize));
            rightTop.attr({"text-anchor": "end", "dominant-baseline": "hanging"});
            rightTop.addClass("corner-label-right-top");
        }
        if (this.leftBottomConfig.label) {
            const leftBottom = this.svgUtil.drawText(this.dimensionCalculator.infoCornetLabelLeftBottom(), this.leftBottomConfig.label,
                TextAttributes.infoCornerLabelAttribute(this.leftBottomConfig.color, this.leftBottomConfig.labelTextSize));
            leftBottom.attr({"text-anchor": "left", "dominant-baseline": "auto"});
            leftBottom.addClass("corner-label-left-bottom");
        }
        if (this.rightBottomConfig.label) {
            const rightBottom = this.svgUtil.drawText(this.dimensionCalculator.infoCornetLabelRightBottom(), this.rightBottomConfig.label,
                TextAttributes.infoCornerLabelAttribute(this.rightBottomConfig.color, this.rightBottomConfig.labelTextSize));
            rightBottom.attr({"text-anchor": "end", "dominant-baseline": "auto"});
            rightBottom.addClass("corner-label-right-bottom");
        }
    }

    drawCornerValues(entityStates: EntityState[]) {
        this.leftTopValue?.remove();
        this.rightTopValue?.remove();
        this.leftBottomValue?.remove();
        this.rightBottomValue?.remove();
        if (this.leftTopConfig.show && entityStates[0].active && !this.isHidden(entityStates[0], this.leftTopConfig)) {
            const coor = this.leftTopConfig.label ? this.leftTopCoor : this.dimensionCalculator.infoCornerLabelLeftTop();
            this.leftTopValue = this.svgUtil.drawText(coor,
                this.getText(entityStates[0], this.leftTopConfig, this.leftTopConverter),
                TextAttributes.infoCornerAttribute(this.resolveColor(entityStates[0], this.leftTopConfig, this.leftTopConverter), this.leftTopConfig.valueTextSize));
            this.leftTopValue.attr({"text-anchor": "left", "dominant-baseline": "hanging"});
            this.leftTopValue.addClass("corner-value-left-top");
            this.leftTopValue.back();
        }
        if (this.rightTopConfig.show && entityStates[1].active && !this.isHidden(entityStates[1], this.rightTopConfig)) {
            const coor = this.rightTopConfig.label ? this.rightTopCoor : this.dimensionCalculator.infoCornerLabelRightTop();
            this.rightTopValue = this.svgUtil.drawText(coor,
                this.getText(entityStates[1], this.rightTopConfig, this.rightTopConverter),
                TextAttributes.infoCornerAttribute(this.resolveColor(entityStates[1], this.rightTopConfig, this.rightTopConverter), this.rightTopConfig.valueTextSize));
            this.rightTopValue.attr({"text-anchor": "end", "dominant-baseline": "hanging"});
            this.rightTopValue.addClass("corner-value-right-top");
            this.rightTopValue.back();
        }
        if (this.leftBottomConfig.show && entityStates[2].active && !this.isHidden(entityStates[2], this.leftBottomConfig)) {
            const coor = this.leftBottomConfig.label ? this.leftBottomCoor : this.dimensionCalculator.infoCornetLabelLeftBottom();
            this.leftBottomValue = this.svgUtil.drawText(coor,
                this.getText(entityStates[2], this.leftBottomConfig, this.leftBottomConverter),
                TextAttributes.infoCornerAttribute(this.resolveColor(entityStates[2], this.leftBottomConfig, this.leftBottomConverter), this.leftBottomConfig.valueTextSize));
            this.leftBottomValue.attr({"text-anchor": "left", "dominant-baseline": "auto"});
            this.leftBottomValue.addClass("corner-value-left-bottom");
            this.leftBottomValue.back();
        }
        if (this.rightBottomConfig.show && entityStates[3].active && !this.isHidden(entityStates[3], this.rightBottomConfig)) {
            const coor = this.rightBottomConfig.label ? this.rightBottomCoor : this.dimensionCalculator.infoCornetLabelRightBottom();
            this.rightBottomValue = this.svgUtil.drawText(coor,
                this.getText(entityStates[3], this.rightBottomConfig, this.rightBottomConverter),
                TextAttributes.infoCornerAttribute(this.resolveColor(entityStates[3], this.rightBottomConfig, this.rightBottomConverter), this.rightBottomConfig.valueTextSize));
            this.rightBottomValue.attr({"text-anchor": "end", "dominant-baseline": "auto"});
            this.rightBottomValue.addClass("corner-value-right-bottom");
            this.rightBottomValue.back();
        }
    }

    private isHidden(entityState: EntityState, config: CornerInfo): boolean {
        return config.hideWhenUnknown && this.isUnknown(entityState);
    }

    private isUnknown(entityState: EntityState): boolean {
        return entityState !== undefined && entityState !== null
            && UNKNOWN_STATES.includes((entityState.state ?? '').toLowerCase());
    }

    private resolveColor(entityState: EntityState, config: CornerInfo, converter: (input: any) => any): string {
        if (!config.valueColors || config.valueColors.length === 0
            || entityState === undefined || entityState === null || this.isUnknown(entityState)) {
            return config.color;
        }
        const numericValue = +converter(entityState.state);
        if (isNaN(numericValue)) {
            return config.color;
        }
        const ranges = config.valueColors;
        let matched = ranges[0];
        for (const range of ranges) {
            if (numericValue >= range.fromValue) {
                matched = range;
            }
        }
        return matched.color;
    }

    private getText(entityState: EntityState, config: CornerInfo, converter: (input: any) => any): string {
        if (entityState === undefined || entityState === null) {
            return "";
        }
        if (this.isUnknown(entityState) && config.unknownValue) {
            return config.unknownValue;
        }
        let stateValue = converter(entityState.state);
        if (!isNaN(stateValue!) && !isNaN(config.precision!)) {
            stateValue = '' + this.round(+stateValue!, config.precision);
        }
        if (config.unit) {
            return stateValue + config.unit;
        }
        return stateValue!;
    }

    private round(value: number, precision = 2): number {
        return Math.round(value * 10 ** precision) / 10 ** precision;
    }
}
