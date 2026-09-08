import {CardConfigSunPosition} from "../card/CardConfigSunPosition";
import {ConfigCheckUtils} from "./ConfigCheckUtils";

export class SunPositionConfig {

    constructor(
        public readonly show: boolean,
        public readonly entity: string | undefined,
        public readonly attribute: string,
        public readonly arrowSize: number,
        public readonly color: string) {
    }

    static fromConfig(config: CardConfigSunPosition | undefined): SunPositionConfig {
        if (!config) {
            return new SunPositionConfig(false, undefined, 'azimuth', 20, 'var(--primary-text-color)');
        }
        const show = ConfigCheckUtils.checkBooleanDefaultTrue(config.show_arrow);
        const entity = ConfigCheckUtils.checkString(config.entity) ?? 'sun.sun';
        const attribute = ConfigCheckUtils.checkStringOrDefault(config.attribute, 'azimuth');
        const arrowSize = ConfigCheckUtils.checkNummerOrDefault(config.arrow_size, 20);
        const color = ConfigCheckUtils.checkStringOrDefault(config.color, 'var(--primary-text-color)');
        return new SunPositionConfig(show, entity, attribute, arrowSize, color);
    }
}
