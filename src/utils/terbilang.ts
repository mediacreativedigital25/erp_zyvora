// Utility function for converting Indonesian Rupiah number to words ("Terbilang")
export function angkaTerbilang(angka: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas'
  ];

  const n = Math.floor(Math.abs(angka));

  if (n === 0) return 'Nol';

  const konversi = (x: number): string => {
    if (x < 12) {
      return bilangan[x];
    } else if (x < 20) {
      return konversi(x - 10) + ' Belas';
    } else if (x < 100) {
      const puluh = Math.floor(x / 10);
      const sisa = x % 10;
      return bilangan[puluh] + ' Puluh' + (sisa > 0 ? ' ' + bilangan[sisa] : '');
    } else if (x < 200) {
      return 'Seratus' + (x > 100 ? ' ' + konversi(x - 100) : '');
    } else if (x < 1000) {
      const ratus = Math.floor(x / 100);
      const sisa = x % 100;
      return bilangan[ratus] + ' Ratus' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else if (x < 2000) {
      return 'Seribu' + (x > 1000 ? ' ' + konversi(x - 1000) : '');
    } else if (x < 1000000) {
      const ribu = Math.floor(x / 1000);
      const sisa = x % 1000;
      return konversi(ribu) + ' Ribu' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else if (x < 1000000000) {
      const juta = Math.floor(x / 1000000);
      const sisa = x % 1000000;
      return konversi(juta) + ' Juta' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else if (x < 1000000000000) {
      const miliar = Math.floor(x / 1000000000);
      const sisa = x % 1000000000;
      return konversi(miliar) + ' Miliar' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else {
      const triliun = Math.floor(x / 1000000000000);
      const sisa = x % 1000000000000;
      return konversi(triliun) + ' Triliun' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    }
  };

  return `${konversi(n).trim()} Rupiah`;
}
