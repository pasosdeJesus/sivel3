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
import confetti from 'canvas-confetti';

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
    donateSuccess: '🎉 Donation completed!',
    thanksTitle: '🙏 Thank you for your donation!',
    thanksMessage: '✨ Your generosity will help document cases of violence in {{region}}. {{amount}} USDT has been donated.'
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
    donateSuccess: '🎉 ¡Donación completada!',
    thanksTitle: '🙏 ¡Gracias por tu donación!',
    thanksMessage: '✨ Tu generosidad ayudará a documentar casos de violencia en {{region}}. Se han donado {{amount}} USDT.'
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
      logger.info('Transacción completada, mostrando agradecimiento...', 'Balance');
      
      // Disparar confeti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b']
      });
      
      // Obtener nombre de la región
      const regionName = donationRegions.find(r => r.id.toString() === selectedRegion)?.name || 
                        (currentLocale === 'es' ? 'la región' : 'the region');
      
      // Mostrar toast internacionalizado
      toast({
        title: t.thanksTitle,
        description: t.thanksMessage
          .replace('{{region}}', regionName)
          .replace('{{amount}}', donationAmount),
        duration: 4000,
      });
      
      logger.info('Esperando 3 segundos para refrescar balance...', 'Balance');
      // Esperar 3 segundos para que la red actualice el estado del contrato
      setTimeout(() => {
        logger.info('Refrescando balance después de delay...', 'Balance');
        fetchBalance(selectedRegion);
      }, 3000);
    }
    prevIsTransactingRef.current = isTransacting;
  }, [isTransacting, selectedRegion, donationAmount, donationRegions, toast, t.thanksTitle, t.thanksMessage, currentLocale]);
  
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

  
  // Estado para controlar pop-ups en móvil
  const [showCounts, setShowCounts] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showDonation, setShowDonation] = useState(false)
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-6">
        {/* El mapa ocupa todo el ancho primero */}
        <div className="w-full mb-4">
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
        
        {/* Botones flotantes para móvil */}
        <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 md:hidden">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full shadow-lg w-12 h-12 p-0"
            onClick={() => setShowCounts(!showCounts)}
          >
            📊
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full shadow-lg w-12 h-12 p-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍
          </Button>
          {isConnected && (
            <Button
              size="sm"
              variant="default"
              className="rounded-full shadow-lg w-12 h-12 p-0 bg-red-500 hover:bg-red-600"
              onClick={() => setShowDonation(!showDonation)}
            >
              ❤️
            </Button>
          )}
        </div>
        
        {/* Pop-up de conteos (flotante) */}
        {showCounts && (
          <div className="fixed bottom-36 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border">
            <div className="flex justify-between items-center p-3 bg-gray-100 border-b">
              <span className="font-semibold text-sm">📊 {t.counts}</span>
              <button onClick={() => setShowCounts(false)} className="text-gray-500">✕</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{t.cases}</span>
                <Badge>{counts.casos.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">{t.victims}</span>
                <Badge>{counts.victimas.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">{t.victimizations}</span>
                <Badge>{counts.victimizaciones.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">{t.acts}</span>
                <Badge>{counts.actos.toLocaleString()}</Badge>
              </div>
            </div>
          </div>
        )}
        
        {/* Pop-up de filtros (flotante) - similar estructura */}
        {showFilters && (
          <div className="fixed bottom-36 right-4 z-50 w-80 max-h-[70vh] overflow-y-auto bg-white rounded-lg shadow-xl border">
            <div className="sticky top-0 flex justify-between items-center p-3 bg-gray-100 border-b">
              <span className="font-semibold text-sm">🔍 {t.filters}</span>
              <button onClick={() => setShowFilters(false)} className="text-gray-500">✕</button>
            </div>
            <div className="p-3 space-y-3">
              {/* Filtros aquí - mantener funcionalidad existente */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t.from}</Label>
                  <Input size="sm" type="date" value={filters['filtro[fechaini]']} onChange={(e) => handleFilterChange('filtro[fechaini]', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t.to}</Label>
                  <Input size="sm" type="date" value={filters['filtro[fechafin]']} onChange={(e) => handleFilterChange('filtro[fechafin]', e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t.department}</Label>
                <Select value={filters['filtro[departamento_id]']} onValueChange={(v) => handleFilterChange('filtro[departamento_id]', v)}>
                  <SelectTrigger><SelectValue placeholder={t.showAll} /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t.allegedPerpetrator}</Label>
                <Select value={filters['filtro[presponsable_id]']} onValueChange={(v) => handleFilterChange('filtro[presponsable_id]', v)}>
                  <SelectTrigger><SelectValue placeholder={t.showAll} /></SelectTrigger>
                  <SelectContent>{allegedPerpetrators.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t.violence}</Label>
                <Select value={filters['filtro[categoria_id]']} onValueChange={(v) => handleFilterChange('filtro[categoria_id]', v)}>
                  <SelectTrigger><SelectValue placeholder={t.showAll} /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full" onClick={applyFilters}>{t.filter}</Button>
            </div>
          </div>
        )}
        
        {/* Pop-up de donación (flotante) */}
        {showDonation && isConnected && (
          <div className="fixed bottom-36 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border">
            <div className="flex justify-between items-center p-3 bg-red-50 border-b">
              <span className="font-semibold text-sm">❤️ {t.donation}</span>
              <button onClick={() => setShowDonation(false)} className="text-gray-500">✕</button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <Label className="text-xs">{t.cause}</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{donationRegions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t.availableFunds}</Label>
                <div className="text-sm font-semibold">{regionBalance ? `${parseFloat(regionBalance).toFixed(2)} USDT` : '--'}</div>
              </div>
              <div>
                <Label className="text-xs">{t.amount}</Label>
                <Input type="number" placeholder="10.00" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} disabled={isTransacting || isApproving} />
              </div>
              <Button size="sm" className="w-full" onClick={handleDonate} disabled={isTransacting || isApproving}>
                {isApproving ? t.approving : isTransacting ? t.donating : t.approve}
              </Button>
            </div>
          </div>
        )}
        
        {/* Versión desktop: layout original (opcional, mantener para pantallas grandes) */}
        <div className="hidden lg:block">
          {/* Aquí va el layout original de escritorio si quieres mantenerlo */}
        </div>
      </main>
    </div>
  );
}
