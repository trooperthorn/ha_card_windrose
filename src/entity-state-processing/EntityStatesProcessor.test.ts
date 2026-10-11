import { describe, expect, test } from "@jest/globals";
import { EntityStatesProcessor } from "./EntityStatesProcessor";
import { CardConfigWrapper } from "../config/CardConfigWrapper";
import { CardConfig } from "../card/CardConfig";
import { HomeAssistant } from "../util/HomeAssistant";

const states: Record<string, string> = {
    'sensor.direction': '180',
    'sensor.speed': '3',
    'sensor.gust': '5',
    'sensor.corner': '10',
    'sensor.unrelated': 'off',
};

function hassWith(values: Record<string, string>): HomeAssistant {
    const hassStates: Record<string, { state: string, attributes: Record<string, unknown> }> = {};
    Object.entries(values).forEach(([entity, state]) => {
        hassStates[entity] = { state, attributes: {} };
    });
    return { states: hassStates } as unknown as HomeAssistant;
}

function createProcessor(): EntityStatesProcessor {
    const config = {
        type: 'windrose-card',
        data_period: { period_back: '-4h' },
        wind_direction_entity: { entity: 'sensor.direction' },
        windspeed_entities: [
            { entity: 'sensor.speed', name: 'Speed', speed_unit: 'mph', output_speed_unit: 'mph' },
            { entity: 'sensor.gust', name: 'Gust', speed_unit: 'mph', output_speed_unit: 'mph', current_speed_arrow: true },
        ],
        corner_info: {
            top_left: { label: 'Corner', entity: 'sensor.corner' },
        },
    } as unknown as CardConfig;
    const processor = new EntityStatesProcessor();
    processor.init(new CardConfigWrapper(config));
    return processor;
}

describe('EntityStatesProcessor update flags', () => {

    test('an unrelated state change after clearUpdates reports no updates', () => {
        const processor = createProcessor();
        processor.updateHass(hassWith(states));
        expect(processor.hasUpdates()).toBe(true);

        // A render pass reads a subset of the states, then clears every flag.
        processor.getWindDirection();
        processor.getWindSpeed(0);
        processor.getCornerInfoStates();
        processor.clearUpdates();

        processor.updateHass(hassWith({ ...states, 'sensor.unrelated': 'on' }));
        expect(processor.hasUpdates()).toBe(false);
    });

    test('corner info and secondary speed flags stay set without clearUpdates', () => {
        const processor = createProcessor();
        processor.updateHass(hassWith(states));
        processor.getWindDirection();
        processor.getWindSpeed(0);
        processor.getWindSpeed(1, false);
        processor.getCornerInfoStates();

        // These are the flags that used to stay set and cause a redraw on
        // every later hass update; clearUpdates is what releases them.
        expect(processor.hasCornerInfoUpdates()).toBe(true);
        expect(processor.hasWindSpeedUpdate(1)).toBe(true);
        processor.clearUpdates();
        expect(processor.hasCornerInfoUpdates()).toBe(false);
        expect(processor.hasWindSpeedUpdate(1)).toBe(false);
    });

    test('a changed corner info state is reported again after clearUpdates', () => {
        const processor = createProcessor();
        processor.updateHass(hassWith(states));
        processor.clearUpdates();

        processor.updateHass(hassWith({ ...states, 'sensor.corner': '11' }));
        expect(processor.hasCornerInfoUpdates()).toBe(true);
        expect(processor.hasUpdates()).toBe(true);
    });
});
