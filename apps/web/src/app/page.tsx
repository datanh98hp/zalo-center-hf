import {
  Activity, Bell, BookOpenText, ChevronDown, CircleHelp, Inbox, Link2,
  MessageCircle, Search, Settings2, ShieldCheck, Users, Zap
} from "lucide-react";

const nav = [
  { label: "Hộp thư", icon: Inbox, active: true, href: "/" },
  { label: "Khách hàng", icon: Users, href: "/contacts" },
  { label: "Tin nhắn nhanh", icon: Zap, href: "/quick-replies" },
  { label: "Tài khoản Zalo", icon: Link2, href: "/integrations" },
  { label: "Nhân viên & phân quyền", icon: ShieldCheck, href: "/employees" },
  { label: "Nhật ký hệ thống", icon: Activity, href: "/" },
];

const conversations = [
  { initials: "NL", name: "Nguyễn Lan", preview: "Em gửi thông tin sản phẩm nhé chị.", time: "10:42", tag: "Lan Anh", color: "bg-violet-100 text-violet-700", unread: true },
  { initials: "TH", name: "Trần Hoàng", preview: "Cho mình xin giá và chính sách giao hàng.", time: "10:31", tag: "Minh Tuấn", color: "bg-emerald-100 text-emerald-700", unread: true },
  { initials: "MA", name: "Mai Anh", preview: "Cảm ơn bạn, mình sẽ xem thêm.", time: "09:58", tag: "Chưa phân công", color: "bg-amber-100 text-amber-800", unread: false },
  { initials: "PQ", name: "Phạm Quang", preview: "Đã nhận được thông tin rồi ạ.", time: "09:24", tag: "Lan Anh", color: "bg-violet-100 text-violet-700", unread: false },
  { initials: "HT", name: "Hoàng Thu", preview: "Bên mình có mẫu màu xanh không?", time: "Hôm qua", tag: "Minh Tuấn", color: "bg-emerald-100 text-emerald-700", unread: false },
];

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-sm text-slate-500">{label}</p>
    <div className="mt-2 flex items-end justify-between gap-2">
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-xs text-slate-500">{note}</span>
    </div>
  </div>;
}

export default function Home() {
  return <main className="min-h-screen md:flex">
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-5">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><MessageCircle size={22}/></div>
        <div><p className="font-bold tracking-tight">Zalo Center</p><p className="text-xs text-slate-500">Customer operations</p></div>
      </div>
      <div className="mt-7 rounded-xl bg-blue-50 p-3">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Không gian làm việc</span><ChevronDown size={15} className="text-blue-700"/></div>
        <p className="mt-1 font-medium">Đội ngũ bán hàng</p>
      </div>
      <nav className="mt-6 grid grid-cols-2 gap-1 md:block md:space-y-1">
        {nav.map(({ label, icon: Icon, active, href }) => <a key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? "bg-blue-600 font-medium text-white" : "text-slate-600 hover:bg-slate-100"}`}>
          <Icon size={18}/><span>{label}</span>
        </a>)}
      </nav>
      <div className="mt-auto hidden rounded-xl border border-slate-200 p-3 md:block">
        <div className="flex items-center gap-2 text-sm font-medium"><CircleHelp size={17}/> Trung tâm trợ giúp</div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Kết nối nguồn Zalo qua tích hợp được cấp phép để bắt đầu đồng bộ.</p>
      </div>
    </aside>

    <section className="min-w-0 flex-1 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-slate-500">Thứ Hai, 19 tháng 10, 2026</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Tổng quan vận hành</h1><p className="mt-1 text-sm text-slate-500">Theo dõi hội thoại và hiệu quả phân công khách hàng.</p></div>
        <div className="flex items-center gap-2">
          <button aria-label="Thông báo" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600"><Bell size={18}/></button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">AD</span><span className="text-left"><span className="block text-sm font-medium">Quản trị viên</span><span className="block text-xs text-slate-500">Admin</span></span><ChevronDown size={15}/></button>
        </div>
      </header>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Hội thoại đang mở" value="128" note="Tổng các nguồn"/>
        <Metric label="Chưa phân công" value="17" note="Cần xử lý"/>
        <Metric label="Khách hàng hôm nay" value="36" note="+12% so với hôm qua"/>
        <Metric label="Nhân viên trực tuyến" value="8/10" note="2 chưa hoạt động"/>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div><h2 className="font-semibold">Hội thoại gần đây</h2><p className="mt-1 text-xs text-slate-500">Dữ liệu minh họa giao diện</p></div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search size={16} className="text-slate-400"/><input aria-label="Tìm hội thoại" placeholder="Tìm khách hàng..." className="w-36 text-sm outline-none sm:w-48"/></div>
          </div>
          <div className="divide-y divide-slate-100">
            {conversations.map(c => <div key={c.name} className="flex items-center gap-3 p-4 transition hover:bg-slate-50">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{c.initials}{c.unread && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600"/>}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{c.name}</p><span className={`rounded-full px-2 py-0.5 text-xs ${c.color}`}>{c.tag}</span></div><p className="mt-1 truncate text-sm text-slate-500">{c.preview}</p></div>
              <span className="shrink-0 text-xs text-slate-400">{c.time}</span>
            </div>)}
          </div>
          <div className="border-t border-slate-100 p-4 text-center"><button className="text-sm font-medium text-blue-700 hover:text-blue-800">Xem tất cả hội thoại →</button></div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Nguồn kết nối</h2><button className="text-slate-500"><Settings2 size={17}/></button></div>
            <p className="mt-1 text-sm text-slate-500">Trạng thái các kênh được cấu hình</p>
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><MessageCircle size={19}/></div><div className="flex-1"><p className="text-sm font-medium">Zalo Official Account</p><p className="text-xs text-slate-500">Chưa cấu hình thông tin xác thực</p></div><span className="h-2 w-2 rounded-full bg-amber-400"/></div>
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Link2 size={19}/></div><div className="flex-1"><p className="text-sm font-medium">Tài khoản bổ sung</p><p className="text-xs text-slate-500">Chờ adapter được phê duyệt</p></div><span className="h-2 w-2 rounded-full bg-slate-300"/></div>
            </div>
            <button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Cấu hình kết nối</button>
          </section>
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center gap-2 text-blue-800"><BookOpenText size={19}/><h2 className="font-semibold">Tin nhắn nhanh</h2></div>
            <p className="mt-2 text-sm leading-6 text-blue-900/75">Chuẩn hóa kịch bản tư vấn để nhân viên phản hồi nhanh và nhất quán.</p>
            <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3"><p className="text-xs font-semibold text-slate-500">MẪU GỢI Ý</p><p className="mt-2 text-sm">Chào anh/chị, cảm ơn anh/chị đã quan tâm. Em có thể hỗ trợ thêm thông tin nào ạ?</p></div>
            <button className="mt-3 text-sm font-semibold text-blue-800">Quản lý thư viện mẫu →</button>
          </section>
        </div>
      </div>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>Zalo Center · Starter UI</span><span>Demo data — chưa kết nối API thực tế</span></footer>
    </section>
  </main>;
}
