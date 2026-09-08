import { HAWebservice } from "./HAWebservice";
import { MeasurementHolder } from "./MeasurementHolder";
import { CardConfigWrapper } from "../config/CardConfigWrapper";
import { Measurement } from "./Measurement";
import { Log } from "../util/Log";
import { WindDirectionEntity } from "../config/WindDirectionEntity";
import { HARequestData } from "./HARequestData";
import { DateTimeFormatter } from "../formatter/DateTimeFormatter";
import { WindSpeedEntity } from "../config/WindSpeedEntity";
import { PeriodCodeHelper } from "../util/PeriodCodeHelper";

export class HAMeasurementProvider {

    private readonly cardConfig: CardConfigWrapper;
    private readonly directionEntity: WindDirectionEntity;

    constructor(private readonly haWebservice: HAWebservice,
                private readonly dateTimeFormatter: DateTimeFormatter,
                cardConfig: CardConfigWrapper) {

        this.cardConfig = cardConfig;
        this.directionEntity = cardConfig.windDirectionEntity;
    }

    getMeasurements(): Promise<MeasurementHolder> {
        const activePeriod = this.cardConfig.activePeriod;
        const requests = [];
        const directionRequestData = HARequestData.fromWindDirectionEntity(this.cardConfig.windDirectionEntity, activePeriod);
        const speedRequestDatas:  HARequestData[] = [];
        requests.push(this.haWebservice.getMeasurementData(activePeriod.startTime, activePeriod.endTime, directionRequestData));
        for (const windspeedEntity of this.cardConfig.windspeedEntities) {
            const haSpeedRequestdata = HARequestData.fromWindSpeedEntity(windspeedEntity, activePeriod);
            speedRequestDatas.push(haSpeedRequestdata);
            requests.push(this.haWebservice.getMeasurementData(activePeriod.startTime, activePeriod.endTime, haSpeedRequestdata));
        }

        return Promise.all(requests).then(results => {
            Log.debug('WebSocket results: ', results);
            const measurementHolder = new MeasurementHolder(this.dateTimeFormatter);
            try {
                if (directionRequestData.useStatistics) {
                    measurementHolder.directionMeasurements = HAMeasurementProvider.parseStatsMeasurements(
                        results[0][this.directionEntity.entity],
                        this.directionEntity.entity,
                        false);
                } else {
                    measurementHolder.directionMeasurements = HAMeasurementProvider.parseHistoryMeasurements(
                        results[0][this.directionEntity.entity],
                        this.directionEntity.entity,
                        this.directionEntity.attribute,
                        false);
                    HAMeasurementProvider.sortAndFillEndTime(measurementHolder.directionMeasurements);
                }

                speedRequestDatas.forEach((speedEntity, i) => {
                    if (speedEntity.useStatistics) {
                        measurementHolder.addSpeedMeasurements(HAMeasurementProvider.parseStatsMeasurements(
                            results[i + 1][speedEntity.entity],
                            speedEntity.entity,
                            true));
                    } else {
                        const measurements = HAMeasurementProvider.parseHistoryMeasurements(
                            results[i + 1][speedEntity.entity],
                            speedEntity.entity,
                            speedEntity.attribute,
                            true);
                        HAMeasurementProvider.sortAndFillEndTime(measurements);
                        measurementHolder.addSpeedMeasurements(measurements);
                    }
                });
            } catch(error: any) {
                measurementHolder.setErrorState(error, this.cardConfig.windspeedEntities.length);
            }
            return Promise.resolve(measurementHolder);
        });
    }

    // Fetches a plain average of one windspeed entity's own values over its own
    // average_period_back window, independent of the rose's display period
    // (issue #108). Direction matching is not needed for an average.
    getAveragingSpeed(windspeedEntity: WindSpeedEntity): Promise<number | undefined> {
        if (!windspeedEntity.averagePeriodBack) {
            return Promise.resolve(undefined);
        }
        const now = new Date();
        const startTime = PeriodCodeHelper.move(windspeedEntity.averagePeriodBack, new Date(now));
        const requestData = HARequestData.fromWindSpeedEntity(windspeedEntity, this.cardConfig.activePeriod);

        return this.haWebservice.getMeasurementData(startTime, now, requestData).then(result => {
            const data = result[windspeedEntity.entity];
            const measurements = requestData.useStatistics
                ? HAMeasurementProvider.parseStatsMeasurements(data, windspeedEntity.entity, true)
                : HAMeasurementProvider.parseHistoryMeasurements(data, windspeedEntity.entity, windspeedEntity.attribute, true);
            if (measurements.length === 0) {
                return undefined;
            }
            const total = measurements.reduce((sum, m) => sum + (+m.value), 0);
            return total / measurements.length;
        });
    }

    private static parseHistoryMeasurements(historyData: HistoryData[], entity: string, attribute: string | undefined, numeric: boolean): Measurement[] {
        const measurements: Measurement[] = [];
        let ignoreCounter = 0;
        if (historyData === undefined || historyData.length === 0) {
            throw new Error('No history data found for entity ' + entity);
        }
        Measurement.initHistory(attribute);
        for (const data of historyData) {
            const value = Measurement.getHistoryValue(data);
            if (numeric) {
                if (HAMeasurementProvider.hasValue(value) && HAMeasurementProvider.isNumeric(value)) {
                    measurements.push(Measurement.fromHistory(data));
                } else {
                    Log.info(`Value from ${entity} ignored: `, data);
                    ignoreCounter++;
                }
            } else {
                if (HAMeasurementProvider.hasValue(value)) {
                    measurements.push(Measurement.fromHistory(data));
                } else {
                    Log.info(`Value from ${entity} ignored: `, data);
                    ignoreCounter++;
                }
            }
        }
        if (ignoreCounter > 10) {
            Log.warn(`More then 10 values from ${entity} are ignored, sest log_level to INFO to investigate.`);
        }
        return measurements;
    }

    private static parseStatsMeasurements(statisticsData: StatisticsData[], entity: string, numeric: boolean): Measurement[] {
        const measurements: Measurement[] = [];
        let ignoreCounter = 0;
        if (statisticsData === undefined || statisticsData.length === 0) {
            throw new Error('No statistics data found for entity ' + entity);
        }
        Measurement.initStats(statisticsData[0]);
        for (const data of statisticsData) {
            const value = Measurement.getStatsValue(data);
            if (numeric) {
                if (HAMeasurementProvider.hasValue(value) && HAMeasurementProvider.isNumeric(value)) {
                    measurements.push(Measurement.fromStats(data));
                } else {
                    Log.info(`Value from ${entity} ignored: `, data);
                    ignoreCounter++;
                }
            } else {
                if (HAMeasurementProvider.hasValue(value)) {
                    measurements.push(Measurement.fromStats(data));
                } else {
                    Log.info(`Value from ${entity} ignored: `, data);
                    ignoreCounter++;
                }
            }
        }
        if (ignoreCounter > 10) {
            Log.warn(`More then 10 values from ${entity} are ignored, set log_level to INFO to investigate. Count: ${ignoreCounter}`);
        }
        return measurements;
    }

    private static hasValue(value: string | number | undefined | null): boolean {
        if (value === null || value === undefined || value === '') {
            return false;
        }
        return true;
    }

    private static isNumeric(value: string | number ): boolean {
        return !isNaN(+value);
    }

    private static sortAndFillEndTime(measurements: Measurement[]) {
        // Allready sorted, first first
        let prevM: Measurement | undefined;
        for (const m of measurements) {
            if (prevM) {
                prevM.endTime = m.startTime;
            }
            prevM = m;
        }
        if (prevM) {
            prevM.endTime = Date.now() / 1000;
        }
    }

}
