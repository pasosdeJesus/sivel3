'use client';

import { Filter, Info, Heart, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

const translations = {
  en: {
    counts: 'Counts',
    totalsByFilters: 'Totals according to applied filters',
    cases: 'Cases',
    victims: 'Victims',
    victimizations: 'Victimizations',
    acts: 'Acts',
    filters: 'Filters',
    from: 'From',
    to: 'To',
    department: 'Department',
    showAll: 'Show All',
    allegedPerpetrator: 'Alleged Perpetrator',
    violence: 'Violence',
    filter: 'Filter',
    connectWallet: 'Connect wallet for advanced features',
    donation: 'Donation',
    cause: 'To document cases in',
    amount: 'Amount (in USDT)',
    donate: 'Donate',
    donating: 'Donating...',
    approving: 'Approving...',
    invalidAmount: 'Please enter a valid donation amount.',
    noRecipient: 'The destination address for the donation is not configured.',
    approve: 'Approve & Donate',
    noContract: 'Donation contract not configured',
    availableFunds: '💰 Regional Balance',
    waitingForConfirmation: 'Waiting for confirmation...',
    donateSuccess: '🎉 Donation completed!'
  },
  es: {
    counts: 'Conteos',
    totalsByFilters: 'Totales según filtros aplicados',
    cases: 'Casos',
    victims: 'Víctimas',
    victimizations: 'Victimizaciones',
    acts: 'Actos',
    filters: 'Filtros',
    from: 'Desde',
    to: 'Hasta',
    department: 'Departamento',
    showAll: 'Mostrar todos',
    allegedPerpetrator: 'P. Responsable',
    violence: 'Violencia',
    filter: 'Filtrar',
    connectWallet: 'Conecta la billetera para funciones avanzadas',
    donation: 'Donación',
    cause: 'Para documentar casos en',
    amount: 'Valor (en USDT)',
    donate: 'Donar',
    donating: 'Donando...',
    approving: 'Aprobando...',
    invalidAmount: 'Por favor, ingrese un monto de donación válido.',
    noRecipient: 'La dirección de destino para la donación no está configurada.',
    approve: 'Aprobar y Donar',
    noContract: 'El contrato de donaciones no está configurado',
    availableFunds: '💰 Balance Regional',
    waitingForConfirmation: 'Esperando confirmación...',
    donateSuccess: '🎉 ¡Donación completada!'
  }
};

const MapComponent = dynamic(() => import('@/components/mapa/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Skeleton className="h-12 w-12 mx-auto rounded-full" />
        <Skeleton className="h-4 w-48 mt-4 mx-auto" />
        <Skeleton className="h-4 w-32 mt-2 mx-auto" />
      </div>
    </div>
  ),
});

interface DonationRegion {
  id: number;
  name: string;
}

export default function OSMMapPage() {
  const params = useParams();
  const currentLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en';
  const t = translations[currentLocale as keyof typeof translations] || translations.en;

  const { isConnected, approveUSDT, donateToRegion, isTransacting, isMiniPay } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationRegions, setDonationRegions] = useState<DonationRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [regionBalance, setRegionBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  
  const [counts, setCounts] = useState({ casos: 0, victimas: 0, victimizaciones: 0, actos: 0 });
  const [filters, setFilters] = useState({
    'filtro[fechaini]': '',
    'filtro[fechafin]': '',
    'filtro[departamento_id]': '',
    'filtro[presponsable_id]': '',
    'filtro[categoria_id]': ''
  });
  
  const [departments, setDepartments] = useState<Array<{id: string, nombre: string}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, nombre: string}>>([]);
  const [allegedPerpetrators, setAllegedPerpetrators] = useState<Array<{id: string, nombre: string}>>([]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [deptRes, catRes, presRes, regionRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/categories'),
          fetch('/api/alleged-perpetrators'),
          fetch(`/api/regions?locale=${currentLocale}`)
        ]);
        setDepartments(await deptRes.json());
        setCategories(await catRes.json());
        setAllegedPerpetrators(await presRes.json());
        const regions = await regionRes.json();
        setDonationRegions(regions);
        if (regions.length > 0) {
          setSelectedRegion(String(regions[0].id));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [currentLocale]);

  // Función para cargar el balance
  const fetchBalance = (regionId: string) => {
    setBalanceLoading(true);
    fetch(`/api/regions/${regionId}/balance`)
      .then(res => res.json())
      .then(data => {
        if (data.balance) {
          setRegionBalance(data.balance);
          logger.info(`Balance actualizado: ${data.balance} USDT`, 'Balance');
        }
      })
      .catch(error => logger.error(`Error fetching region balance: ${error}`, 'Balance'))
      .finally(() => setBalanceLoading(false));
  };

  // Cargar balance cuando cambia la región seleccionada
  useEffect(() => {
    if (selectedRegion) {
      fetchBalance(selectedRegion);
    }
  }, [selectedRegion]);

  // Refrescar balance después de una transacción (cuando isTransacting pasa de true a false)
  const prevIsTransactingRef = useRef(isTransacting);
  useEffect(() => {
    // Si estaba transactando y ya no, refrescar balance
    if (prevIsTransactingRef.current === true && isTransacting === false && selectedRegion) {
      logger.info('Transacción completada, refrescando balance...', 'Balance');
      fetchBalance(selectedRegion);
    }
    prevIsTransactingRef.current = isTransacting;
  }, [isTransacting, selectedRegion]);
  
  const handleFilterChange = (key: string, value: string) => {
    if (value === "separator") return;
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const applyFilters = () => console.log('Applying filters:', filters);
  
  const handleCountsLoad = (newCounts: any) => setCounts(newCounts);

  const handleDonate = async () => {
    const amount = parseFloat(donationAmount);
    logger.info(`handleDonate llamado - Amount: ${donationAmount}, Region: ${selectedRegion}`, 'DonatePage')
    
    if (isNaN(amount) || amount <= 0) {
      logger.error(`Monto inválido: ${donationAmount}`, 'DonatePage')
      alert(t.invalidAmount);
      return;
    }

    const contractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`;
    logger.info(`Contract address from env: ${contractAddress}`, 'DonatePage')
    
    if (!contractAddress) {
      logger.error('Contract address no configurada', 'DonatePage')
      alert(t.noContract);
      return;
    }

    try {
      logger.info('Iniciando approveUSDT...', 'DonatePage')
      setIsApproving(true);
      
      // En MiniPay, usar alert nativa (más confiable que toast)
      // En desktop, solo toast (la wallet ya muestra su propio popup)
      if (isMiniPay) {
        alert('🟡 Aprobación iniciada. Confirma la transacción en MiniPay cuando aparezca el popup.')
      }
      
      await approveUSDT(contractAddress, donationAmount);
      logger.success('approveUSDT transaction submitted', 'DonatePage')
      
      // En MiniPay: preguntar si continuar después de la aprobación
      // En desktop: esperar 2 segundos (la wallet ya manejó la confirmación)
      if (isMiniPay) {
        const userConfirmed = confirm('✅ Aprobación confirmada. ¿Deseas continuar con la donación?')
        if (!userConfirmed) {
          setIsApproving(false)
          return
        }
      } else {
        // Pequeña pausa en desktop para dar tiempo a que la wallet procese
        logger.info('Esperando 2 segundos para que la wallet procese...', 'DonatePage')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      logger.info('Procediendo con la donación...', 'DonatePage')
      const amount = parseFloat(donationAmount);
      const regionId = parseInt(selectedRegion, 10);
      await donateToRegion(regionId, amount.toString());
      
      // Alerta solo en MiniPay (desktop: toast)
      if (isMiniPay) {
        alert(`🎉 ¡Donación completada! Se donaron ${donationAmount} USDT a la región seleccionada.`)
      } else {
        toast({
          title: t.donateSuccess || '🎉 ¡Donación completada!',
          description: `Se donaron ${donationAmount} USDT a la región seleccionada`,
        })
      }
      
      logger.success('Donación completada', 'DonatePage')
    } catch (error) {
      logger.error(`Error en proceso de donación: ${error}`, 'DonatePage')
      console.error(error);
    } finally {
      setIsApproving(false);
    }
  };

  useEffect(() => {
    if (isApproving && !isTransacting) {
      // Approval finished, now donate
      setIsApproving(false);
      const amount = parseFloat(donationAmount);
      const regionId = parseInt(selectedRegion, 10);
      donateToRegion(regionId, amount.toString());
    }
  }, [isApproving, isTransacting]);

  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  📊 {t.counts}
                </CardTitle>
                <CardDescription>{t.totalsByFilters}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t.cases}</span>
                      <Badge variant="secondary">{counts.casos.toLocaleString()}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t.victims}</span>
                      <Badge variant="secondary">{counts.victimas.toLocaleString()}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t.victimizations}</span>
                      <Badge variant="secondary">{counts.victimizaciones.toLocaleString()}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t.acts}</span>
                      <Badge variant="secondary">{counts.actos.toLocaleString()}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t.filters}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campo-desde" className="text-primary">{t.from}</Label>
                    <Input id="campo-desde" type="date" value={filters['filtro[fechaini]']} onChange={(e) => handleFilterChange('filtro[fechaini]', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campo-hasta" className="text-primary">{t.to}</Label>
                    <Input id="campo-hasta" type="date" value={filters['filtro[fechafin]']} onChange={(e) => handleFilterChange('filtro[fechafin]', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t.department}</Label>
                  <Select name="department" value={filters['filtro[departamento_id]']} onValueChange={(v) => handleFilterChange('filtro[departamento_id]', v)}>
                    <SelectTrigger id="department"><SelectValue placeholder={t.showAll} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t.showAll}</SelectItem>
                      <Separator />
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presponsable">{t.allegedPerpetrator}</Label>
                  <Select name="presponsable" value={filters['filtro[presponsable_id]']} onValueChange={(v) => handleFilterChange('filtro[presponsable_id]', v)}>
                    <SelectTrigger id="presponsable"><SelectValue placeholder={t.showAll} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t.showAll}</SelectItem>
                      <Separator />
                      {allegedPerpetrators.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tvio">{t.violence}</Label>
                  <Select name="tvio" value={filters['filtro[categoria_id]']} onValueChange={(v) => handleFilterChange('filtro[categoria_id]', v)}>
                    <SelectTrigger id="tvio"><SelectValue placeholder={t.showAll} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t.showAll}</SelectItem>
                      <Separator />
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center pt-4">
                  <Button onClick={applyFilters} className="w-full md:w-auto px-8">{t.filter}</Button>
                </div>
              </CardContent>
            </Card>

            {isConnected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    {t.donation}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cause">{t.cause}</Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {donationRegions.map(region => (
                          <SelectItem key={region.id} value={String(region.id)}>{region.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.availableFunds}</Label>
                    <div className="text-sm font-semibold p-2 border rounded-md bg-gray-50">
                      {balanceLoading ? (
                        <Skeleton className="h-5 w-24" />
                      ) : regionBalance !== null ? (
                        `$${parseFloat(regionBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                      ) : (
                        '--'
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t.amount}</Label>
                    <Input 
                      id="amount"
                      type="number" 
                      placeholder="10.00" 
                      value={donationAmount} 
                      onChange={(e) => setDonationAmount(e.target.value)}
                      disabled={isTransacting || isApproving}
                    />
                  </div>
                  <Button className="w-full" onClick={handleDonate} disabled={isTransacting || isApproving}>
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.approving}
                      </>
                    ) : isTransacting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.donating}
                      </>
                    ) : (
                      t.approve
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isConnected && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <Info className="h-4 w-4" />
                    <span>{t.connectWallet}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <MapComponent
                  filtros={filters}
                  onCargarConteos={handleCountsLoad}
                  isConnected={isConnected}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
