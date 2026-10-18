'use client'

import { useState } from 'react'
import { Map } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RegionsTab } from '@/components/sales/territory/regions-tab'
import { ZonesTab } from '@/components/sales/territory/zones-tab'
import { CitiesTab } from '@/components/sales/territory/cities-tab'
import { BranchesTab } from '@/components/sales/territory/branches-tab'
import { AreasTab } from '@/components/sales/territory/areas-tab'
import { CustomersTab } from '@/components/sales/territory/customers-tab'
import { ProductGroupsTab } from '@/components/sales/territory/product-groups-tab'

/**
 * Territory Setup — the full sales-management hierarchy admin.
 * Region → Zone → City → Branch → Area → Customer, with drill-down, plus Product Groups
 * (which branches stock).
 */
export default function TerritoryPage() {
  const [tab, setTab] = useState('regions')

  // Drill-down: clicking a row filters the next level down to it.
  const [drillRegionId, setDrillRegionId] = useState<string | undefined>(undefined)
  const [drillZoneId, setDrillZoneId] = useState<string | undefined>(undefined)
  const [drillCityId, setDrillCityId] = useState<string | undefined>(undefined)
  const [drillBranchId, setDrillBranchId] = useState<string | undefined>(undefined)
  const [drillAreaId, setDrillAreaId] = useState<string | undefined>(undefined)

  return (
    <ProtectedRoute requiredPermission="sales-region.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Map className="h-8 w-8 text-green-600" />
            Territory Setup
          </h1>
          <p className="text-gray-600 mt-1">
            Manage the sales territory: Region → Zone → City → Branch → Area → Customer, plus the product groups branches stock.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex h-auto flex-wrap gap-1 bg-gray-100 p-1">
            <TabsTrigger value="regions">Regions</TabsTrigger>
            <TabsTrigger value="zones">Zones</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="areas">Areas</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="product-groups">Product Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="regions" className="mt-4">
            <RegionsTab
              onDrillToZones={(region) => {
                setDrillRegionId(region.id)
                setDrillZoneId(undefined)
                setDrillCityId(undefined)
                setDrillBranchId(undefined)
                setDrillAreaId(undefined)
                setTab('zones')
              }}
            />
          </TabsContent>

          <TabsContent value="zones" className="mt-4">
            <ZonesTab
              key={`zones-${drillRegionId ?? 'all'}`}
              initialRegionId={drillRegionId}
              onDrillToCities={(zone) => {
                setDrillZoneId(zone.id)
                setDrillCityId(undefined)
                setDrillBranchId(undefined)
                setDrillAreaId(undefined)
                setTab('cities')
              }}
            />
          </TabsContent>

          <TabsContent value="cities" className="mt-4">
            <CitiesTab
              key={`cities-${drillZoneId ?? 'all'}`}
              initialZoneId={drillZoneId}
              onDrillToBranches={(city) => {
                setDrillCityId(city.id)
                setDrillBranchId(undefined)
                setDrillAreaId(undefined)
                setTab('branches')
              }}
            />
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
            <BranchesTab
              key={`branches-${drillCityId ?? 'all'}`}
              initialCityId={drillCityId}
              onDrillToAreas={(branch) => {
                setDrillBranchId(branch.id)
                setDrillAreaId(undefined)
                setTab('areas')
              }}
            />
          </TabsContent>

          <TabsContent value="areas" className="mt-4">
            <AreasTab
              key={`areas-${drillBranchId ?? 'all'}`}
              initialBranchId={drillBranchId}
              onDrillToCustomers={(area) => {
                setDrillAreaId(area.id)
                setTab('customers')
              }}
            />
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <CustomersTab key={`customers-${drillAreaId ?? 'all'}`} initialAreaId={drillAreaId} />
          </TabsContent>

          <TabsContent value="product-groups" className="mt-4">
            <ProductGroupsTab />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
