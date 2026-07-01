import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ErrorResponse, FlightList, FlightStats, HealthStatus } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFlightsUrl: () => string;
/**
 * Returns current aircraft positions from OpenSky Network. Results are cached for ~8 seconds server-side.
 * @summary Get all live flights
 */
export declare const getFlights: (options?: RequestInit) => Promise<FlightList>;
export declare const getGetFlightsQueryKey: () => readonly ["/api/flights"];
export declare const getGetFlightsQueryOptions: <TData = Awaited<ReturnType<typeof getFlights>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlights>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFlights>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFlightsQueryResult = NonNullable<Awaited<ReturnType<typeof getFlights>>>;
export type GetFlightsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get all live flights
 */
export declare function useGetFlights<TData = Awaited<ReturnType<typeof getFlights>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlights>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFlightStatsUrl: () => string;
/**
 * Returns country counts, altitude buckets, speed distribution, and emergency list derived from the current snapshot.
 * @summary Aggregated flight statistics
 */
export declare const getFlightStats: (options?: RequestInit) => Promise<FlightStats>;
export declare const getGetFlightStatsQueryKey: () => readonly ["/api/flights/stats"];
export declare const getGetFlightStatsQueryOptions: <TData = Awaited<ReturnType<typeof getFlightStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlightStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFlightStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFlightStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getFlightStats>>>;
export type GetFlightStatsQueryError = ErrorType<unknown>;
/**
 * @summary Aggregated flight statistics
 */
export declare function useGetFlightStats<TData = Awaited<ReturnType<typeof getFlightStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlightStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map