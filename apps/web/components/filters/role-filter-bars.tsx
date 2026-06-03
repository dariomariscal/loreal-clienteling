"use client";

import * as React from "react";
import { EntityFilter } from "./entity-filter";
import { FilterBar } from "./filter-bar";
import { useReportFilterOptions } from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * Pre-composed filter bars per role — DRY. Every report for a given role uses
 * the same set of entity filters, so we hoist the composition here. Reports
 * just render <AreaManagerFilterBar />, etc.
 *
 * Dropdowns are faceted: each slot pulls its options from /analytics/filter-
 * options, which returns only entities that have activity under the currently
 * selected filters. Selecting "Lancôme" narrows stores/BAs; no zero-result
 * options ever appear.
 *
 * If a future report needs an extra slot, override by composing <FilterBar>
 * + <EntityFilter> directly — these helpers don't lock you in.
 */

export function CounterManagerFilterBar() {
  const { filters } = useFilters();
  const { data } = useReportFilterOptions(filters);
  const bas = data?.baUsers;
  return (
    <FilterBar
      role="counter_manager"
      slots={{
        baUserId: (
          <EntityFilter
            filterKey="baUserId"
            placeholder="Todos los BAs"
            options={bas}
          />
        ),
      }}
      chipLabels={{
        baUserId: (id) => `BA: ${bas?.find((u) => u.id === id)?.label ?? id}`,
      }}
    />
  );
}

export function AreaManagerFilterBar() {
  const { filters } = useFilters();
  const { data } = useReportFilterOptions(filters);
  const banners = data?.banners;
  const stores = data?.stores;
  const brands = data?.brands;
  const bas = data?.baUsers;

  return (
    <FilterBar
      role="area_manager"
      slots={{
        banner: (
          <EntityFilter
            filterKey="banner"
            placeholder="Todas las franquicias"
            options={banners}
          />
        ),
        storeId: (
          <EntityFilter
            filterKey="storeId"
            placeholder="Todas las tiendas"
            options={stores}
          />
        ),
        brandId: (
          <EntityFilter
            filterKey="brandId"
            placeholder="Todas las marcas"
            options={brands}
          />
        ),
        baUserId: (
          <EntityFilter
            filterKey="baUserId"
            placeholder="Todos los BAs"
            options={bas}
          />
        ),
      }}
      chipLabels={{
        banner: (code) =>
          `Franquicia: ${banners?.find((b) => b.id === code)?.label ?? code}`,
        storeId: (id) =>
          `Tienda: ${stores?.find((s) => s.id === id)?.label ?? id}`,
        brandId: (id) =>
          `Marca: ${brands?.find((b) => b.id === id)?.label ?? id}`,
        baUserId: (id) =>
          `BA: ${bas?.find((u) => u.id === id)?.label ?? id}`,
      }}
    />
  );
}

export function NationalFilterBar() {
  const { filters } = useFilters();
  const { data } = useReportFilterOptions(filters);
  const banners = data?.banners;
  const stores = data?.stores;
  const brands = data?.brands;
  const bas = data?.baUsers;

  return (
    <FilterBar
      role="national_retail_manager"
      slots={{
        banner: (
          <EntityFilter
            filterKey="banner"
            placeholder="Todas las franquicias"
            options={banners}
          />
        ),
        storeId: (
          <EntityFilter
            filterKey="storeId"
            placeholder="Todas las tiendas"
            options={stores}
          />
        ),
        brandId: (
          <EntityFilter
            filterKey="brandId"
            placeholder="Todas las marcas"
            options={brands}
          />
        ),
        baUserId: (
          <EntityFilter
            filterKey="baUserId"
            placeholder="Todos los BAs"
            options={bas}
          />
        ),
      }}
      chipLabels={{
        banner: (code) =>
          `Franquicia: ${banners?.find((b) => b.id === code)?.label ?? code}`,
        storeId: (id) =>
          `Tienda: ${stores?.find((s) => s.id === id)?.label ?? id}`,
        brandId: (id) =>
          `Marca: ${brands?.find((b) => b.id === id)?.label ?? id}`,
        baUserId: (id) =>
          `BA: ${bas?.find((u) => u.id === id)?.label ?? id}`,
      }}
    />
  );
}
