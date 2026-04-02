// config/menu.ts
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  Settings,
  Library,
  Shuffle,
  DoorOpen,
  HeartHandshake,
  Brain,
  FileSpreadsheet,
  ClipboardCheck,
  BarChart3,
  Star,
  Crown,
} from 'lucide-react'

export type MenuItem = {
  title: string
  href: string
  icon: any
  roles: string[]
}

export const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad', 'guru', 'guru_bk', 'guru_piket', 'wali_kelas', 'resepsionis', 'guru_ppl']
  },
  {
    title: 'Data Siswa',
    href: '/dashboard/siswa',
    icon: Users,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad', 'guru', 'guru_bk', 'wali_kelas']
  },
  {
    title: 'Manajemen Kelas',
    href: '/dashboard/kelas',
    icon: Library,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad']
  },
  {
    title: 'Plotting & Kenaikan',
    href: '/dashboard/plotting',
    icon: Shuffle,
    roles: ['super_admin', 'admin_tu', 'kepsek']
  },
  {
    title: 'Pusat Akademik',
    href: '/dashboard/akademik',
    icon: BookOpen,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad']
  },
  {
    title: 'Rekap Nilai',
    href: '/dashboard/akademik/nilai',
    icon: FileSpreadsheet,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad']
  },
  {
    title: 'Program Unggulan',
    href: '/dashboard/program-unggulan',
    icon: Star,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad', 'guru', 'wali_kelas']
  },
  {
    title: 'Kelola Unggulan',
    href: '/dashboard/program-unggulan/kelola',
    icon: Crown,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad']
  },
  {
    title: 'Guru & Pegawai',
    href: '/dashboard/guru',
    icon: GraduationCap,
    roles: ['super_admin', 'admin_tu', 'kepsek']
  },
  {
    title: 'Kehadiran & Jurnal',
    href: '/dashboard/kehadiran',
    icon: CalendarCheck,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad', 'guru', 'guru_piket', 'wali_kelas']
  },
  {
    title: 'Perizinan Siswa',
    href: '/dashboard/izin',
    icon: DoorOpen,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad', 'guru_bk', 'guru_piket', 'resepsionis']
  },
  {
    title: 'Kedisiplinan',
    href: '/dashboard/kedisiplinan',
    icon: AlertTriangle,
    roles: ['super_admin', 'admin_tu', 'kepsek', 'wakamad', 'guru_bk', 'guru_piket', 'resepsionis', 'guru_ppl', 'wali_kelas']
  },
  {
    title: 'Bimbingan Konseling',
    href: '/dashboard/bk',
    icon: HeartHandshake,
    roles: ['super_admin', 'kepsek', 'wakamad', 'guru_bk']
  },
  {
    title: 'Psikotes & Minat',
    href: '/dashboard/psikotes',
    icon: Brain,
    roles: ['super_admin', 'kepsek', 'wakamad', 'guru_bk', 'guru']
  },
  {
    title: 'Presensi Pegawai',
    href: '/dashboard/presensi',
    icon: ClipboardCheck,
    roles: ['super_admin', 'admin_tu', 'resepsionis']
  },
  {
    title: 'Monitoring Presensi',
    href: '/dashboard/monitoring-presensi',
    icon: BarChart3,
    roles: ['super_admin', 'admin_tu', 'kepsek']
  },
  {
    title: 'Pengaturan',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['super_admin', 'kepsek', 'admin_tu']
  }
]
