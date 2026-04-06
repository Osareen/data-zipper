// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Types
interface RawMapping {
  firstName: string;
  lastName: string;
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  recordedDate: string;
  filterColumn: string;
  houseNumber: string;
  streetSuffix: string;
  unitType: string;
  unitId: string;
  dob: string;
  fico: string;
  loanAmount: string;
  estimatedValue: string;
  loanType: string;
  custom1: string;
  custom2: string;
  custom3: string;
  custom4: string;
}

interface PhoneMapping {
  firstName: string; lastName: string; zip: string;
  phone1: string; phoneType1: string;
  phone2: string; phoneType2: string;
  phone3: string; phoneType3: string;
  phone4: string; phoneType4: string;
  phone5: string; phoneType5: string;
}

interface FilterRule {
  column: string;
  operator: string;
  value: string;
}

interface ProcessedRow {
  "First Name": string;
  "Last Name": string;
  "Address": string;
  "City": string;
  "State": string;
  "Zip": string;
  "Phone 1": string;
  "Email": string;
  "Phone 2": string;
  "DOB": string;
  "FICO": string;
  "Loan Bal": string;
  "Estimated": string;
  "Loan Type": string;
  "Custom 1": string;
  "Custom 2": string;
  "Custom 3": string;
  "Custom 4": string;
  "Sep": string;
  "sms_v1.xml": string;
}

const getValue = (record: Record<string, string>, key: string): string => {
  return key && record[key] ? record[key] : '';
};

// Helper function to format phone number as (XXX) XXX-XXXX
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const phoneStr = String(phone).replace(/\D/g, '');
  if (phoneStr.length >= 10) {
    const last10 = phoneStr.slice(-10);
    const areaCode = last10.slice(0, 3);
    const prefix = last10.slice(3, 6);
    const lineNumber = last10.slice(6, 10);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }
  return phone;
};

export default function Home() {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [phoneFile, setPhoneFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [phoneHeaders, setPhoneHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);
  const [filterRule, setFilterRule] = useState<FilterRule>({ column: '', operator: 'equals', value: '' });
  const [showFilter, setShowFilter] = useState(false);

  const [rawMapping, setRawMapping] = useState<RawMapping>({
    firstName: '', lastName: '', fullAddress: '', street: '', city: '', state: '', zip: '', recordedDate: '', filterColumn: '',
    houseNumber: '', streetSuffix: '', unitType: '', unitId: '',
    dob: '', fico: '', loanAmount: '', estimatedValue: '', loanType: '',
    custom1: '', custom2: '', custom3: '', custom4: ''
  });

  const [phoneMapping, setPhoneMapping] = useState<PhoneMapping>({
    firstName: '', lastName: '', zip: '',
    phone1: '', phoneType1: '',
    phone2: '', phoneType2: '',
    phone3: '', phoneType3: '',
    phone4: '', phoneType4: '',
    phone5: '', phoneType5: ''
  });

  useEffect(() => {
    const savedRaw = localStorage.getItem('dataZipper_rawMapping');
    const savedPhone = localStorage.getItem('dataZipper_phoneMapping');
    if (savedRaw) { setRawMapping(JSON.parse(savedRaw)); }
    if (savedPhone) { setPhoneMapping(JSON.parse(savedPhone)); }
  }, []);

  const saveRawMapping = (updates: Partial<RawMapping>) => {
    const newMapping = { ...rawMapping, ...updates };
    setRawMapping(newMapping);
    localStorage.setItem('dataZipper_rawMapping', JSON.stringify(newMapping));
  };

  const savePhoneMapping = (updates: Partial<PhoneMapping>) => {
    const newMapping = { ...phoneMapping, ...updates };
    setPhoneMapping(newMapping);
    localStorage.setItem('dataZipper_phoneMapping', JSON.stringify(newMapping));
  };

  const handleRawFile = (file: File | null) => {
    setRawFile(file);
    if (file) {
      setIsLoading(true);
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          preview: 1,
          complete: (results: Papa.ParseResult<unknown>) => {
            if (results.meta.fields) setRawHeaders(results.meta.fields);
            setIsLoading(false);
          },
          error: () => setIsLoading(false)
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
            defval: '',
            header: 1
          });
          
          if (jsonData.length > 0) {
            const firstRow = jsonData[0] as string[];
            const headers = firstRow.filter(h => h !== undefined && h !== '');
            setRawHeaders(headers);
          }
          setIsLoading(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        setIsLoading(false);
      }
    }
  };

  const handlePhoneFile = (file: File | null) => {
    setPhoneFile(file);
    if (file) {
      setIsLoading(true);
      Papa.parse(file, {
        header: true,
        preview: 1,
        complete: (results: Papa.ParseResult<unknown>) => {
          if (results.meta.fields) setPhoneHeaders(results.meta.fields);
          setIsLoading(false);
        },
        error: () => setIsLoading(false)
      });
    }
  };

  const parseFullFile = (file: File): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          complete: (results) => resolve(results.data as Record<string, string>[]),
          error: reject
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
            defval: ''
          }) as Record<string, string>[];
          
          resolve(jsonData);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file type'));
      }
    });
  };

  const applyFilter = (row: Record<string, string>): boolean => {
    if (!filterRule.column || !filterRule.value) return true;
    const cellValue = row[filterRule.column] || '';
    const cellLower = cellValue.toLowerCase();
    const filterValue = filterRule.value.toLowerCase();
    switch (filterRule.operator) {
      case 'equals': return cellLower === filterValue;
      case 'not-equals': return cellLower !== filterValue;
      case 'contains': return cellLower.includes(filterValue);
      case 'not-contains': return !cellLower.includes(filterValue);
      default: return true;
    }
  };

  const processData = async () => {
    if (!rawFile || !phoneFile) { alert('Please upload both files first'); return; }
    setIsProcessing(true);
    try {
      const rawData = await parseFullFile(rawFile);
      const phoneData = await parseFullFile(phoneFile);
      
      let filteredRaw = rawData;
      if (filterRule.column && filterRule.value) {
        filteredRaw = rawData.filter(applyFilter);
      }
      
      console.log(`After user filter: ${filteredRaw.length} of ${rawData.length} rows`);
      
      const processedRaw = filteredRaw
        .map(row => {
          let fullStreet = getValue(row, rawMapping.fullAddress);
          if (!fullStreet) {
            const houseNum = getValue(row, rawMapping.houseNumber);
            const streetName = getValue(row, rawMapping.street);
            const streetSuffix = getValue(row, rawMapping.streetSuffix);
            const unitType = getValue(row, rawMapping.unitType);
            const unitId = getValue(row, rawMapping.unitId);
            
            if (houseNum) fullStreet += houseNum + ' ';
            if (streetName) fullStreet += streetName;
            if (streetSuffix) fullStreet += ' ' + streetSuffix;
            if (unitType && unitId) fullStreet += ` ${unitType} ${unitId}`;
            fullStreet = fullStreet.trim();
          }
          
          const cityValue = getValue(row, rawMapping.city);
          const stateValue = getValue(row, rawMapping.state);
          let zipValue = getValue(row, rawMapping.zip);
          
          if (!zipValue) {
            const zipKeys = Object.keys(row).filter(k => 
              k.toLowerCase().includes('zip') || 
              k.toLowerCase().includes('postal') ||
              k === 'ZIP_CD' ||
              k === 'SitusZIP5'
            );
            if (zipKeys.length > 0) {
              zipValue = getValue(row, zipKeys[0]);
            }
          }
          
          return {
            row,
            fullStreet: fullStreet,
            city: cityValue ? String(cityValue).trim() : '',
            state: stateValue ? String(stateValue).trim() : '',
            zip: zipValue ? String(zipValue).trim() : '',
            hasValidLocation: cityValue && stateValue && String(cityValue).trim() !== '' && String(stateValue).trim() !== ''
          };
        })
        .filter(item => item.hasValidLocation);
      
      console.log(`After location filter: ${processedRaw.length} rows`);
      
      const processedPhone = phoneData.map(row => {
        const phones: { number: string; type: string }[] = [];
        for (let i = 1; i <= 5; i++) {
          const numField = phoneMapping[`phone${i}` as keyof PhoneMapping] as string;
          const typeField = phoneMapping[`phoneType${i}` as keyof PhoneMapping] as string;
          if (numField && row[numField]) {
            phones.push({ number: row[numField], type: typeField ? (row[typeField] || '').toLowerCase() : '' });
          }
        }
        const mobiles = phones.filter(p => p.type.includes('mobile'));
        const landlines = phones.filter(p => !p.type.includes('mobile'));
        const bestPhones = [...mobiles, ...landlines];
        
        let email = '';
        const emailKeys = Object.keys(row).filter(k => 
          k.toLowerCase().includes('email') && 
          (k.includes('Skiptrace:emails.') || k === 'Email' || k === 'email')
        );
        for (const key of emailKeys) {
          if (row[key] && row[key].trim() !== '') {
            email = row[key];
            break;
          }
        }
        
        return { row, bestPhones: bestPhones, email: email };
      });
      
      const merged: ProcessedRow[] = processedRaw.map(({ row, fullStreet, city, state, zip }) => {
        const rawFirstName = getValue(row, rawMapping.firstName);
        const rawLastName = getValue(row, rawMapping.lastName);
        const matchKey = `${rawFirstName}_${rawLastName}_${zip}`.toLowerCase().trim();
        
        const phoneMatch = processedPhone.find(item => {
          const phoneFirstName = getValue(item.row, phoneMapping.firstName);
          const phoneLastName = getValue(item.row, phoneMapping.lastName);
          const phoneZip = getValue(item.row, phoneMapping.zip);
          const phoneKey = `${phoneFirstName}_${phoneLastName}_${phoneZip}`.toLowerCase().trim();
          return phoneKey === matchKey;
        });
        
        const phones = phoneMatch?.bestPhones || [];
        const bestMobile = phones.find(p => p.type.includes('mobile'))?.number || phones[0]?.number || '';
        const email = phoneMatch?.email || '';
        const dob = getValue(row, rawMapping.dob) || '';
        const fico = getValue(row, rawMapping.fico) || '';
        const loanBal = getValue(row, rawMapping.loanAmount) || '';
        const estimated = getValue(row, rawMapping.estimatedValue) || '';
        const loanType = getValue(row, rawMapping.loanType) || '';
        
        const custom1 = getValue(row, rawMapping.custom1);
        const custom2 = getValue(row, rawMapping.custom2);
        const custom3 = getValue(row, rawMapping.custom3);
        const custom4 = getValue(row, rawMapping.custom4);
        
        const formattedPhone = formatPhone(bestMobile);
        
        return {
          "First Name": rawFirstName,
          "Last Name": rawLastName,
          "Address": fullStreet,
          "City": city,
          "State": state,
          "Zip": zip,
          "Phone 1": formattedPhone,
          "Email": email,
          "Phone 2": formattedPhone,
          "DOB": dob,
          "FICO": fico,
          "Loan Bal": loanBal,
          "Estimated": estimated,
          "Loan Type": loanType,
          "Custom 1": custom1,
          "Custom 2": custom2,
          "Custom 3": custom3,
          "Custom 4": custom4,
          "Sep": "",
          "sms_v1.xml": ""
        };
      });
      
      setProcessedData(merged);
      console.log(`Final merged data: ${merged.length} records`);
      
      if (merged.length === 0) {
        alert('No valid records found after filtering. Check that your data has City and State values.');
        setIsProcessing(false);
        return;
      }
      
      const csv = Papa.unparse(merged);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'Outbound_IQ_Ready_File.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStep(3);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing data. Check your column mappings.');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = (data: ProcessedRow[]) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Outbound_IQ_Ready_File.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#E6F0DC' }}>
      {isLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading file...</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '72rem', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#55883B' }}>The Data Zipper</h1>
        <p style={{ color: '#9A6735' }}>Transform and merge your property data with skip-traced phone numbers</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          {[1, 2, 3].map(num => (
            <div key={num} style={{ padding: '0.5rem 1.5rem', borderRadius: '100px', background: step === num ? '#9A6735' : '#ddd', color: step === num ? 'white' : '#666' }}>
              Step {num}: {num === 1 ? 'Upload' : num === 2 ? 'Configure' : 'Export'}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', marginTop: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ border: '2px dashed #ccc', padding: '2rem', borderRadius: '1rem' }}>
                <input type="file" id="raw" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleRawFile(e.target.files?.[0] || null)} />
                <label htmlFor="raw" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '3rem' }}>📊</div>
                  <h3>Upload Raw Data</h3>
                  <p style={{ fontSize: '0.875rem', color: '#9A6735' }}>CSV or Excel files accepted</p>
                  <p>{rawFile ? rawFile.name : 'Choose File'}</p>
                </label>
                {rawHeaders.length > 0 && <div>✓ {rawHeaders.length} columns</div>}
              </div>
              <div style={{ border: '2px dashed #ccc', padding: '2rem', borderRadius: '1rem' }}>
                <input type="file" id="phone" accept=".csv" style={{ display: 'none' }} onChange={(e) => handlePhoneFile(e.target.files?.[0] || null)} />
                <label htmlFor="phone" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '3rem' }}>📱</div>
                  <h3>Upload Phone Data</h3>
                  <p style={{ fontSize: '0.875rem', color: '#9A6735' }}>CSV file from BatchData</p>
                  <p>{phoneFile ? phoneFile.name : 'Choose File'}</p>
                </label>
                {phoneHeaders.length > 0 && <div>✓ {phoneHeaders.length} columns</div>}
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!rawFile || !phoneFile} style={{ marginTop: '2rem', padding: '0.75rem 2rem', background: rawFile && phoneFile ? '#9A6735' : '#ccc', color: 'white', border: 'none', borderRadius: '100px', cursor: rawFile && phoneFile ? 'pointer' : 'not-allowed' }}>
              Configure Data →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', marginTop: '2rem', textAlign: 'left' }}>
            <h2 style={{ color: '#55883B', marginBottom: '0.5rem' }}>Configure Your Data</h2>
            <p style={{ color: '#9A6735', marginBottom: '1.5rem' }}>Your saved mappings are loaded automatically.</p>

            <button onClick={() => setShowFilter(!showFilter)} style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#E6F0DC', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
              {showFilter ? '▼ Hide Advanced Filter' : '▶ Show Advanced Filter (Optional)'}
            </button>

            {showFilter && (
              <div style={{ background: '#f5f0e6', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#55883B', marginBottom: '0.5rem', fontSize: '1rem' }}>Filter Data</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select value={filterRule.column} onChange={(e) => setFilterRule({ ...filterRule, column: e.target.value })} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                    <option value="">Select Column...</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <select value={filterRule.operator} onChange={(e) => setFilterRule({ ...filterRule, operator: e.target.value })} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                    <option value="equals">Equals</option>
                    <option value="not-equals">Does Not Equal</option>
                    <option value="contains">Contains</option>
                    <option value="not-contains">Does Not Contain</option>
                  </select>
                  <input type="text" placeholder="Value" value={filterRule.value} onChange={(e) => setFilterRule({ ...filterRule, value: e.target.value })} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ color: '#55883B' }}>📊 Raw Data Columns</h3>
                <div style={{ background: '#f5f0e6', padding: '1rem', borderRadius: '0.5rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>First Name *</label>
                    <select value={rawMapping.firstName} onChange={(e) => saveRawMapping({ firstName: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                      <option value="">Select column...</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Last Name *</label>
                    <select value={rawMapping.lastName} onChange={(e) => saveRawMapping({ lastName: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                      <option value="">Select column...</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Full Address (Recommended)</label>
                    <select value={rawMapping.fullAddress} onChange={(e) => saveRawMapping({ fullAddress: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                      <option value="">Select column...</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>City *</label>
                    <select value={rawMapping.city} onChange={(e) => saveRawMapping({ city: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                      <option value="">Select column...</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>State *</label>
                    <select value={rawMapping.state} onChange={(e) => saveRawMapping({ state: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                      <option value="">Select column...</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Zip Code *</label>
                    <select value={rawMapping.zip} onChange={(e) => saveRawMapping({ zip: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                      <option value="">Select column...</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(154,103,53,0.2)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9A6735', marginBottom: '0.5rem' }}>🏠 Address Components (fallback)</p>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>House Number</label>
                      <select value={rawMapping.houseNumber} onChange={(e) => saveRawMapping({ houseNumber: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Street Name</label>
                      <select value={rawMapping.street} onChange={(e) => saveRawMapping({ street: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Street Suffix</label>
                      <select value={rawMapping.streetSuffix} onChange={(e) => saveRawMapping({ streetSuffix: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Unit Type</label>
                      <select value={rawMapping.unitType} onChange={(e) => saveRawMapping({ unitType: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Unit Number</label>
                      <select value={rawMapping.unitId} onChange={(e) => saveRawMapping({ unitId: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(154,103,53,0.2)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9A6735', marginBottom: '0.5rem' }}>📈 Additional Data</p>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>DOB / Birth Date</label>
                      <select value={rawMapping.dob} onChange={(e) => saveRawMapping({ dob: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>FICO / Credit Score</label>
                      <select value={rawMapping.fico} onChange={(e) => saveRawMapping({ fico: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Loan Amount</label>
                      <select value={rawMapping.loanAmount} onChange={(e) => saveRawMapping({ loanAmount: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Estimated Value</label>
                      <select value={rawMapping.estimatedValue} onChange={(e) => saveRawMapping({ estimatedValue: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Loan Type</label>
                      <select value={rawMapping.loanType} onChange={(e) => saveRawMapping({ loanType: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(154,103,53,0.2)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9A6735', marginBottom: '0.5rem' }}>🎨 Custom Fields (map any extra columns here)</p>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Custom Field 1</label>
                      <select value={rawMapping.custom1} onChange={(e) => saveRawMapping({ custom1: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Custom Field 2</label>
                      <select value={rawMapping.custom2} onChange={(e) => saveRawMapping({ custom2: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Custom Field 3</label>
                      <select value={rawMapping.custom3} onChange={(e) => saveRawMapping({ custom3: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>Custom Field 4</label>
                      <select value={rawMapping.custom4} onChange={(e) => saveRawMapping({ custom4: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontSize: '0.75rem' }}>
                        <option value="">Select column...</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ color: '#55883B' }}>📱 Phone Data Columns</h3>
                <div style={{ background: '#f5f0e6', padding: '1rem', borderRadius: '0.5rem' }}>
                  {['firstName', 'lastName', 'zip'].map(field => (
                    <div key={field} style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.25rem' }}>
                        {field.charAt(0).toUpperCase() + field.slice(1)} *
                      </label>
                      <select value={phoneMapping[field as keyof PhoneMapping] as string} onChange={(e) => savePhoneMapping({ [field]: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                        <option value="">Select column...</option>
                        {phoneHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#55883B', marginBottom: '0.5rem' }}>Phone Numbers (up to 5)</p>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select value={phoneMapping[`phone${i}` as keyof PhoneMapping] as string} onChange={(e) => savePhoneMapping({ [`phone${i}`]: e.target.value })} style={{ flex: 2, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                          <option value="">Phone #{i}</option>
                          {phoneHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <select value={phoneMapping[`phoneType${i}` as keyof PhoneMapping] as string} onChange={(e) => savePhoneMapping({ [`phoneType${i}`]: e.target.value })} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
                          <option value="">Type</option>
                          {phoneHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button onClick={() => setStep(1)} style={{ padding: '0.75rem 2rem', background: '#ccc', border: 'none', borderRadius: '100px', cursor: 'pointer' }}>← Back</button>
              <button onClick={processData} disabled={isProcessing} style={{ padding: '0.75rem 2rem', background: isProcessing ? '#ccc' : '#9A6735', color: 'white', border: 'none', borderRadius: '100px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                {isProcessing ? 'Processing...' : 'Process & Download →'}
              </button>
            </div>
          </div>
        )}

{step === 3 && (
  <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', marginTop: '2rem' }}>
    <h2 style={{ color: '#55883B' }}>✓ Processing Complete!</h2>
    <p style={{ color: '#9A6735', marginBottom: '1rem' }}>Successfully processed {processedData.length} records.</p>
    <div style={{ background: '#f5f0e6', padding: '1rem', borderRadius: '0.5rem', maxHeight: '300px', overflow: 'auto', textAlign: 'left', fontSize: '0.75rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#55883B' }}>First Name</th>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#55883B' }}>Last Name</th>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#55883B' }}>Phone 1</th>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#55883B' }}>Custom 1</th>
          </tr>
        </thead>
        <tbody>
          {processedData.slice(0, 5).map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{row["First Name"]}</td>
              <td style={{ padding: '0.5rem' }}>{row["Last Name"]}</td>
              <td style={{ padding: '0.5rem' }}>{row["Phone 1"]}</td>
              <td style={{ padding: '0.5rem' }}>{row["Custom 1"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {processedData.length > 5 && <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#9A6735' }}>...and {processedData.length - 5} more rows</p>}
    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
      <button onClick={() => { setStep(2); setProcessedData([]); }} style={{ padding: '0.75rem 2rem', background: '#ccc', border: 'none', borderRadius: '100px', cursor: 'pointer' }}>Process Another File</button>
      <button onClick={() => exportToCSV(processedData)} style={{ padding: '0.75rem 2rem', background: '#55883B', color: 'white', border: 'none', borderRadius: '100px', cursor: 'pointer' }}>Download CSV Again 📥</button>
    </div>
  </div>
)}
      </div>
    </div>
  );
}