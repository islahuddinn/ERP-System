'use client';

import { useState } from 'react';
import { Search, MapPin, User, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BrokerFormProps {
    onBrokerSelect: (broker: any) => void;
    selectedBroker: any | null;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    searchResults: any[];
    showDropdown: boolean;
    isLoading: boolean;
    onSearchFocus: () => void;
    onSearchBlur: () => void;
}

export default function BrokerForm({
    onBrokerSelect,
    selectedBroker,
    searchTerm,
    onSearchChange,
    searchResults,
    showDropdown,
    isLoading,
    onSearchFocus,
    onSearchBlur
}: BrokerFormProps) {
    return (
        <div className="space-y-4">
            {/* Broker Search */}
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search broker by name or code..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={onSearchFocus}
                        onBlur={onSearchBlur}
                        className="pl-9 h-11 bg-white border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-xl"
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
                        </div>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                    <Card className="absolute top-full left-0 right-0 z-50 mt-2 shadow-2xl border-emerald-100 overflow-hidden rounded-xl">
                        <CardContent className="p-0 max-h-64 overflow-y-auto">
                            {searchResults.map((broker) => (
                                <button
                                    key={broker.id}
                                    className="w-full flex items-center justify-between p-3 hover:bg-emerald-50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                                    onMouseDown={() => onBrokerSelect(broker)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <User className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700">
                                                {broker.name}
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase">{broker.brokerCode}</span>
                                                {broker.zone && (
                                                    <>
                                                        <span className="mx-1">•</span>
                                                        <MapPin className="w-3 h-3" />
                                                        {broker.zone.name}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 translate-x-0 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Selected Broker Display */}
            {selectedBroker ? (
                <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-900">{selectedBroker.name}</h4>
                                    <div className="text-[11px] text-emerald-700 font-medium">#{selectedBroker.brokerCode}</div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onBrokerSelect(null)}
                                className="h-6 w-6 p-0 rounded-full text-emerald-600 hover:text-rose-600 hover:bg-rose-50"
                            >
                                <ChevronRight className="w-4 h-4 rotate-45" />
                            </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-emerald-100/50 pt-3">
                            <div className="bg-white/60 p-2 rounded-lg border border-emerald-50">
                                <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-0.5">Commission</div>
                                <div className="text-xs font-bold text-slate-900">{selectedBroker.commissionRate}%</div>
                            </div>
                            <div className="bg-white/60 p-2 rounded-lg border border-emerald-50">
                                <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-0.5">Area</div>
                                <div className="text-xs font-bold text-slate-900 truncate">{selectedBroker.zone?.name || 'N/A'}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium max-w-[12rem]">
                        Search and select a broker for this sale
                    </p>
                </div>
            )}
        </div>
    );
}
