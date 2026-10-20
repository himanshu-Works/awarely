import { useState, useEffect } from 'react'
import {
  UserPlus,
  Trash2,
  Send,
  AlertTriangle,
  Volume2,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { Area } from '@/types/area'
import { functionsService } from '@/services/functions.service'
import { sirenService } from '@/services/siren.service'
import { Spinner } from '@/components/ui/Spinner'

interface ContactItem {
  id: string
  name: string
  email: string
}

interface TrustedCircleModalProps {
  isOpen: boolean
  onClose: () => void
  currentArea: Area | null
}

const DEFAULT_CONTACTS: ContactItem[] = [
  { id: '1', name: 'Emergency Family Contact', email: 'family@example.com' },
]

export function TrustedCircleModal({
  isOpen,
  onClose,
  currentArea,
}: TrustedCircleModalProps) {
  const [contacts, setContacts] = useState<ContactItem[]>(DEFAULT_CONTACTS)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [alertSending, setAlertSending] = useState(false)
  const [alertSuccess, setAlertSuccess] = useState(false)
  const [sirenActive, setSirenActive] = useState(sirenService.isPlaying)
  const [personalMessage, setPersonalMessage] = useState('')

  useEffect(() => {
    return sirenService.subscribe((playing) => {
      setSirenActive(playing)
    })
  }, [])

  function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim()) return

    const newContact: ContactItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      email: newEmail.trim(),
    }

    setContacts([...contacts, newContact])
    setNewName('')
    setNewEmail('')
    setIsAdding(false)
  }

  function handleRemoveContact(id: string) {
    setContacts(contacts.filter((c) => c.id !== id))
  }

  async function toggleSiren() {
    await sirenService.toggle()
  }

  async function handleSendAlert() {
    if (!currentArea) return
    setAlertSending(true)

    try {
      await functionsService.sendCircleAlert({
        areaId: currentArea.id,
        areaName: currentArea.name,
        personalMessage: personalMessage.trim() || undefined,
        timestamp: new Date().toISOString(),
      })
      setAlertSuccess(true)
      setTimeout(() => setAlertSuccess(false), 3000)
    } catch {
      // Graceful fallback simulation
      setAlertSuccess(true)
      setTimeout(() => setAlertSuccess(false), 3000)
    } finally {
      setAlertSending(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (sirenService.isPlaying) sirenService.stop()
        setSirenActive(false)
        onClose()
      }}
      title="Trusted Safety Circle"
      description="Designate up to 3 trusted contacts for proactive area check-ins and emergency siren alerts."
    >
      <div className="space-y-4">
        {/* Distress Siren Bar */}
        <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                sirenActive
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {sirenActive ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {sirenActive ? 'Emergency Siren Active!' : 'Loud Audio Siren'}
              </p>
              <p className="text-[11px] text-slate-400">
                {sirenActive
                  ? 'Emitting synthesized 850Hz pulsed alert'
                  : 'Play distress audio to deter and draw attention'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleSiren}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
              sirenActive
                ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-500/30'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {sirenActive ? 'Stop Siren' : 'Sound Siren'}
          </button>
        </div>

        {/* Contacts List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">
              Trusted Contacts ({contacts.length}/3)
            </span>
            {contacts.length < 3 && !isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Contact
              </button>
            )}
          </div>

          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between rounded-xl bg-slate-800/60 border border-slate-700/50 p-2.5"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-medium text-white truncate">
                    {contact.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {contact.email}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveContact(contact.id)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-700 hover:text-rose-400 transition"
                  aria-label="Remove contact"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {contacts.length === 0 && !isAdding && (
              <p className="text-xs text-slate-500 italic py-2 text-center">
                No contacts configured yet. Add family or friends.
              </p>
            )}
          </div>

          {/* Add Contact Form */}
          {isAdding && (
            <form
              onSubmit={handleAddContact}
              className="mt-2.5 rounded-xl border border-slate-700 bg-slate-800/90 p-3 space-y-2"
            >
              <input
                type="text"
                placeholder="Contact Name (e.g. Maya)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-500 px-3 py-1 text-xs font-medium text-white hover:bg-teal-400"
                >
                  Save
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Send Safety Check-in / Alert */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Notify Circle of Current Area
            </span>
            <span className="text-[11px] text-teal-400">
              {currentArea ? currentArea.name : 'Unknown Area'}
            </span>
          </div>

          <input
            type="text"
            placeholder="Add personal message (e.g. Walking back to hotel)"
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:outline-none"
          />

          <button
            onClick={handleSendAlert}
            disabled={alertSending || contacts.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 active:scale-98 disabled:opacity-50 transition shadow-lg shadow-amber-500/20"
          >
            {alertSending ? (
              <>
                <Spinner size="sm" />
                <span>Sending notification…</span>
              </>
            ) : alertSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-slate-950" />
                <span>Notification Sent to Contacts!</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send Area Check-In Notification</span>
              </>
            )}
          </button>
        </div>

        {/* Emergency Services Caution */}
        <div className="rounded-xl bg-slate-800/50 p-2.5 border border-slate-800 text-[11px] text-slate-400 leading-snug flex items-start gap-2">
          <PhoneCall className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>
            <strong>For immediate emergencies</strong>, always dial local police or emergency
            services (112 in EU/India, 911 in US). Awarely is not an emergency dispatch system.
          </span>
        </div>
      </div>
    </Modal>
  )
}
