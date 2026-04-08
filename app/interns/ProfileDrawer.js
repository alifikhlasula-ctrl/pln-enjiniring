import { X, Edit, Trash, Printer, GraduationCap, MapPin, CalendarDays, Clock, FileText, CheckCircle2, AlertCircle, Phone, CreditCard, User, Key } from 'lucide-react'
import Swal from 'sweetalert2'

const idr = v => new Intl.NumberFormat('id-ID').format(v || 0)
const AVATAR_COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899']
const getColor = name => AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length]
const getInitials = name => (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()

const progressPct = (start, end) => {
  const s=new Date(start),e=new Date(end),t=new Date()
  if(isNaN(s)||isNaN(e)||e<=s) return 0
  return Math.min(100,Math.max(0,Math.round(((t-s)/(e-s))*100)))
}
const sisaHari = end => {
  if(!end) return null
  const t=new Date(); t.setHours(0,0,0,0)
  return Math.ceil((new Date(end)-t)/86400000)
}

const STATUS_MAP = {
  ACTIVE:     { bg:'#dcfce7', color:'#065f46', label:'AKTIF' },
  COMPLETED:  { bg:'#ede9fe', color:'#5b21b6', label:'SELESAI' },
  TERMINATED: { bg:'#fee2e2', color:'#991b1b', label:'DIHENTIKAN' }
}

function DocRow({ label, value }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{label}</span>
      <span style={{fontSize:'0.8rem',fontWeight:600,color:value?'var(--secondary)':'var(--text-muted)',display:'flex',alignItems:'center',gap:4}}>
        {value ? <><CheckCircle2 size={12} strokeWidth={2}/> {value}</> : <><AlertCircle size={12} strokeWidth={2}/> Belum ada</>}
      </span>
    </div>
  )
}

export function ProfileDrawer({ intern, onClose, onEdit, onDelete }) {
  if (!intern) return null
  const sisa = sisaHari(intern.periodEnd)
  const pct  = progressPct(intern.periodStart, intern.periodEnd)
  const st   = STATUS_MAP[intern.status] || STATUS_MAP.ACTIVE
  const avatarBg = getColor(intern.name)
  const userImage = intern.user?.image

  const previewPhoto = () => {
    if (!userImage) return
    Swal.fire({
      imageUrl: userImage,
      imageAlt: `Foto ${intern.name}`,
      showConfirmButton: false,
      showCloseButton: true,
      width: 'auto',
      padding: '0',
      background: 'transparent',
      backdrop: 'rgba(0,0,0,0.85)'
    })
  }

  const printSlip = () => {
    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><title>Profil Peserta Magang</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:700px;margin:0 auto}
    .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px}
    .avatar{width:64px;height:64px;border-radius:50%;background:${avatarBg};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0}
    h1{font-size:22px;margin:0}p{margin:4px 0;color:#64748b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:8px 4px;border-bottom:1px solid #e2e8f0;font-size:13px}
    td:first-child{color:#64748b;width:40%}td:last-child{font-weight:600}
    .badge{display:inline-block;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:700;background:${st.bg};color:${st.color}}
    .section-title{background:#f8fafc;padding:6px 8px;font-weight:800;font-size:11px;color:#475569;margin-top:16px;border-left:4px solid #6366f1}
    .prog{height:8px;background:#e2e8f0;border-radius:4px;margin-top:8px}
    .prog-fill{height:8px;width:${pct}%;background:#6366f1;border-radius:4px}
    .footer{margin-top:40px;font-size:11px;color:#94a3b8;text-align:center}</style></head>
    <body><div class="header"><div class="avatar">${getInitials(intern.name)}</div>
    <div><h1>${intern.name}</h1><p>NIM/NIS: ${intern.nim_nis}</p>
    <p><span class="badge">${st.label}</span></p></div></div>
    <div class="section-title">BIODATA PRIBADI</div>
    <table>
      <tr><td>NIK</td><td>${intern.nik||'-'}</td></tr>
      <tr><td>Tanggal Lahir</td><td>${intern.birthDate||'-'}</td></tr>
      <tr><td>Alamat</td><td>${intern.address||'-'}</td></tr>
      <tr><td>Email</td><td>${intern.email||intern.user?.email||'-'}</td></tr>
      <tr><td>No. HP / WA</td><td>${intern.phone||'-'}</td></tr>
      <tr><td>Jenis Kelamin</td><td>${intern.gender||'-'}</td></tr>
    </table>
    <div class="section-title">INFORMASI AKADEMIK & PENEMPATAN</div>
    <table>
      <tr><td>Universitas/Sekolah</td><td>${intern.university}</td></tr>
      <tr><td>Jenjang</td><td>${intern.jenjang}</td></tr>
      <tr><td>Jurusan</td><td>${intern.major}</td></tr>
      <tr><td>Bidang</td><td>${intern.bidang||'-'}</td></tr>
      <tr><td>Wilayah Kerja</td><td>${intern.wilayah||'-'}</td></tr>
      <tr><td>Periode</td><td>${intern.periodStart} s/d ${intern.periodEnd}</td></tr>
      <tr><td>Durasi</td><td>${intern.duration||'-'}</td></tr>
      <tr><td>Progress Magang</td><td>${pct}%<div class="prog"><div class="prog-fill"></div></div></td></tr>
    </table>
    <div class="section-title">DATA REKENING & PEMBAYARAN</div>
    <table>
      <tr><td>Nama Bank</td><td>${intern.bankName||'-'}</td></tr>
      <tr><td>Nomor Rekening</td><td>${intern.bankAccount||'-'}</td></tr>
      <tr><td>Nama Pemilik</td><td>${intern.bankAccountName||'-'}</td></tr>
    </table>
    <div class="section-title">DOKUMEN ADMINISTRASI</div>
    <table>
      <tr><td>Surat Penerimaan</td><td>${intern.suratPenerimaan||'-'}</td></tr>
      <tr><td>SPK/Perjanjian</td><td>${intern.spk||'-'}</td></tr>
      <tr><td>Surat Selesai</td><td>${intern.suratSelesai||'-'}</td></tr>
    </table>
    <div class="footer">Dicetak: ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} · HRIS Magang PLN Enjiniring</div>
    </body></html>`
    const w = window.open('','_blank','width=750,height=900')
    w.document.write(html); w.document.close()
    setTimeout(()=>w.print(), 500)
  }

  const handleResetAccount = async () => {
    const { value: formValues } = await Swal.fire({
      title: `Reset Akun: ${intern.name}`,
      html: `
        <div style="text-align: left; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-muted)">Pastikan Anda telah memverifikasi identitas peserta magang ini sebelum mengubah akunnya.</div>
        <input id="swal-input1" class="swal2-input" placeholder="Email Baru" type="email" style="max-width: 100%; box-sizing: border-box; width: 85%;">
        <input id="swal-input2" class="swal2-input" placeholder="Password Baru" type="password" style="max-width: 100%; box-sizing: border-box; width: 85%;">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Reset Akun',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#f59e0b',
      preConfirm: () => {
        const newEmail = document.getElementById('swal-input1').value
        const newPassword = document.getElementById('swal-input2').value
        if (!newEmail || !newPassword) {
          Swal.showValidationMessage('Email dan Password baru wajib diisi')
          return false
        }
        return { newEmail, newPassword }
      }
    })

    if (formValues) {
      try {
        const res = await fetch('/api/interns/reset-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            internId: intern.id,
            newEmail: formValues.newEmail,
            newPassword: formValues.newPassword
          })
        })
        const data = await res.json()
        if (data.success) {
          Swal.fire('Berhasil', data.message || 'Akun berhasil direset', 'success')
        } else {
          Swal.fire('Gagal', data.error || 'Terjadi kesalahan sistem', 'error')
        }
      } catch (err) {
        Swal.fire('Gagal', err.message, 'error')
      }
    }
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',justifyContent:'flex-end'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(3px)'}}/>
      <div style={{
        position:'relative',width:'100%',maxWidth:420,background:'var(--bg-card)',
        overflowY:'auto',boxShadow:'-12px 0 48px rgba(0,0,0,0.25)',
        animation:'slideInRight 0.28s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',flexDirection:'column'
      }}>
        {/* Avatar header */}
        <div style={{padding:'1.5rem',background:`linear-gradient(135deg, ${avatarBg}22, transparent)`,borderBottom:'1px solid var(--border)'}}>
          <button onClick={onClose} style={{position:'absolute',top:'1rem',right:'1rem',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20} strokeWidth={2}/></button>
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <div 
              onClick={previewPhoto}
              style={{
                width:64,height:64,borderRadius:'50%',background:avatarBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'#fff',flexShrink:0,
                overflow:'hidden', cursor: userImage ? 'zoom-in' : 'default', border: '2px solid var(--border)'
              }}
              title={userImage ? 'Klik untuk lihat foto full' : ''}
            >
              {userImage ? (
                <img src={userImage} alt={intern.name} style={{width:'100%', height:'100%', objectFit:'cover', pointerEvents: 'none'}} />
              ) : (
                getInitials(intern.name)
              )}
            </div>
            <div>
              <p style={{fontWeight:800,fontSize:'1.05rem',lineHeight:1.2}}>{intern.name}</p>
              <p style={{fontSize:'0.78rem',color:'var(--text-secondary)',marginTop:2}}>{intern.email || intern.user?.email || '-'}</p>
              <p style={{fontSize:'0.78rem',color:'var(--text-muted)',fontFamily:'monospace',marginTop:2}}>{intern.nim_nis}</p>
              <span style={{display:'inline-block',marginTop:6,padding:'3px 10px',borderRadius:999,fontSize:'0.7rem',fontWeight:700,background:st.bg,color:st.color}}>{st.label}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{padding:'1rem 1.5rem',background:'var(--bg-main)',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:6}}>
            <span>Progress Magang</span>
            <span style={{fontWeight:700,color:pct>=80?'var(--secondary)':pct>=40?'var(--primary)':'var(--warning)'}}>{pct}%</span>
          </div>
          <div style={{height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
            <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${avatarBg},var(--secondary))`,borderRadius:4,transition:'width 0.6s'}}/>
          </div>
          {sisa!=null && (
            <p style={{fontSize:'0.72rem',marginTop:6,color:sisa<=7?'var(--danger)':sisa<=14?'var(--warning)':'var(--text-muted)',fontWeight:sisa<=14?700:400}}>
              {sisa>0?`⏱ ${sisa} hari lagi`:sisa===0?'⚠ Berakhir hari ini':'✓ Periode telah selesai'}
            </p>
          )}
        </div>

        {/* Info sections */}
        <div style={{padding:'1.25rem 1.5rem',flex:1}}>
          <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'0.75rem',letterSpacing:'0.05em'}}>Biodata Pribadi</p>
          {[
            [<User size={14} strokeWidth={2}/>, intern.nik || '-', 'NIK (Nomor Induk Kependudukan)'],
            [<CalendarDays size={14} strokeWidth={2}/>, intern.birthDate || '-', 'Tanggal Lahir'],
            [<MapPin size={14} strokeWidth={2}/>, intern.address || '-', 'Alamat Lengkap'],
            [<Phone size={14} strokeWidth={2}/>, intern.phone || '-', 'No. Handphone / WhatsApp'],
          ].map(([icon,main,sub],i)=>(
            <div key={i} style={{display:'flex',gap:'0.675rem',alignItems:'flex-start',marginBottom:'0.75rem'}}>
              <span style={{color:'var(--text-muted)',marginTop:2}}>{icon}</span>
              <div><p style={{fontSize:'0.85rem',fontWeight:600}}>{main}</p><p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{sub}</p></div>
            </div>
          ))}

          <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',margin:'1.25rem 0 0.75rem',letterSpacing:'0.05em'}}>Akademik & Penempatan</p>
          {[
            [<GraduationCap size={14} strokeWidth={2}/>, intern.university, `${intern.major} (${intern.jenjang})`],
            [<MapPin size={14} strokeWidth={2}/>, intern.wilayah||'-', intern.bidang||'-'],
            [<Clock size={14} strokeWidth={2}/>, `${intern.periodStart} → ${intern.periodEnd}`, intern.duration||'-'],
          ].map(([icon,main,sub],i)=>(
            <div key={i} style={{display:'flex',gap:'0.675rem',alignItems:'flex-start',marginBottom:'0.75rem'}}>
              <span style={{color:'var(--text-muted)',marginTop:2}}>{icon}</span>
              <div><p style={{fontSize:'0.85rem',fontWeight:600}}>{main}</p><p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{sub}</p></div>
            </div>
          ))}

          <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',margin:'1.25rem 0 0.75rem',letterSpacing:'0.05em'}}>Informasi Rekening</p>
          {[
            [<CreditCard size={14} strokeWidth={2}/>, intern.bankAccount || '-', intern.bankName || 'Nama Bank'],
            [<User size={14} strokeWidth={2}/>, intern.bankAccountName || '-', 'Nama Pemilik Rekening'],
          ].map(([icon,main,sub],i)=>(
            <div key={i} style={{display:'flex',gap:'0.675rem',alignItems:'flex-start',marginBottom:'0.75rem'}}>
              <span style={{color:'var(--text-muted)',marginTop:2}}>{icon}</span>
              <div><p style={{fontSize:'0.85rem',fontWeight:700,color:'var(--primary)'}}>{main}</p><p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{sub}</p></div>
            </div>
          ))}

          <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',margin:'1rem 0 0.5rem',letterSpacing:'0.05em'}}>Dokumen</p>
          <DocRow label="Surat Penerimaan" value={intern.suratPenerimaan}/>
          <DocRow label="SPK/Perjanjian" value={intern.spk}/>
          <DocRow label="Surat Selesai" value={intern.suratSelesai}/>
        </div>

        {/* Footer actions */}
        <div style={{padding:'1rem 1.5rem',borderTop:'1px solid var(--border)',display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
          <button className="btn btn-primary" style={{flex:1,fontSize:'0.8rem'}} onClick={()=>onEdit(intern)}>
            <Edit size={14} strokeWidth={2}/> Edit Data
          </button>
          <button className="btn btn-secondary" style={{fontSize:'0.8rem',padding:'0.5rem 0.875rem',color:'#f59e0b'}} onClick={handleResetAccount} title="Reset Akun (Password & Email)">
            <Key size={14} strokeWidth={2}/>
          </button>
          <button className="btn btn-secondary" style={{fontSize:'0.8rem',padding:'0.5rem 0.875rem'}} onClick={printSlip} title="Cetak Profil">
            <Printer size={14} strokeWidth={2}/>
          </button>
          <button className="btn btn-secondary" style={{fontSize:'0.8rem',padding:'0.5rem 0.875rem',color:'var(--danger)'}} onClick={()=>onDelete(intern.id)} title="Hapus">
            <Trash size={14} strokeWidth={2}/>
          </button>
        </div>
      </div>
      <style jsx>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}
