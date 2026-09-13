"use client";

import { useState } from "react";
import { CheckMark, HandIcon } from "../components/illustrations";
import { MiniNav } from "../components/mini-nav";
import "./me.css";

const consentItems = [
  ["健康资料处理", "已同意"],
  ["自动化辅助生成", "已同意"],
  ["每日计划提醒", "未开启"],
];

export default function MePage() {
  const [deleteRequested, setDeleteRequested] = useState(false);

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="phone me-phone" aria-label="轻练我的 mockup">
        <header className="topbar">
          {/* Native anchors keep navigation working in the Sites/vinext runtime. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="brand" href="/" aria-label="返回轻练今天">
            <span className="brand-mark">轻</span>
            <span>轻练</span>
          </a>
          <span className="subpage-label">我的</span>
        </header>

        <div className="scroll-content" id="me-top">
          <section className="profile-hero">
            <div className="profile-avatar">M</div>
            <div><p className="eyebrow">MY RHYTHM</p><h1>小满</h1><p className="welcome-copy">和身体好好相处的第 8 天</p></div>
            <span className="profile-sparkle" aria-hidden="true"><HandIcon name="sun" /></span>
          </section>

          <section className="profile-status-card">
            <div><span className="approved"><i /> 计划进行中</span><h2>30 天减脂计划</h2><p>教练已确认 · 第 8 / 30 天</p></div>
            <div className="profile-status-ring"><strong>26%</strong><span>完成</span></div>
          </section>

          <section className="me-section">
            <div className="section-heading"><div><p className="section-kicker">YOUR PROFILE</p><h2>基础情况</h2></div><span className="section-meta">教练可见</span></div>
            <div className="profile-facts">
              <div><span>目标</span><strong>减脂</strong></div>
              <div><span>训练经验</span><strong>新手</strong></div>
              <div><span>身高</span><strong>170 cm</strong></div>
              <div><span>体重</span><strong>65 kg</strong></div>
              <div><span>每周训练</span><strong>3 次</strong></div>
              <div><span>训练时长</span><strong>45 分钟</strong></div>
            </div>
            <p className="me-note">资料有变化时，请直接联系教练调整；第一版不支持客户自行修改计划。</p>
          </section>

          <section className="me-section">
            <div className="section-heading"><div><p className="section-kicker">CONSENTS</p><h2>我的同意</h2></div></div>
            <div className="consent-list">
              {consentItems.map(([label, status]) => <div className="consent-row" key={label}><span className="consent-icon">{status === "已同意" ? <CheckMark /> : <span className="consent-dot" />}</span><strong>{label}</strong><small className={status === "已同意" ? "consent-on" : "consent-off"}>{status}</small></div>)}
            </div>
            <p className="me-note">自动化工具只辅助生成草案，客户始终只会看到教练确认后的内容。</p>
          </section>

          <section className="me-section data-section">
            <div className="section-heading"><div><p className="section-kicker">DATA CONTROL</p><h2>数据控制</h2></div></div>
            <div className="data-card"><div><strong>申请删除资料</strong><p>{deleteRequested ? "申请已记录，进入 30 天恢复期（界面演示）" : "提交后会进入 30 天恢复期"}</p></div><button type="button" className={deleteRequested ? "delete-button requested" : "delete-button"} onClick={() => setDeleteRequested(true)} disabled={deleteRequested}>{deleteRequested ? "已提交" : "申请删除"}</button></div>
            <p className="disclaimer">这里是产品界面演示；真实删除状态需要通过客户 API 回读。</p>
          </section>
        </div>

        <MiniNav active="me" />
      </section>
    </main>
  );
}
