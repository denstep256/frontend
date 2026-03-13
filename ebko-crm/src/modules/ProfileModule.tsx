import { useEffect, useState } from 'react'
import { ROLE_LABELS } from '../constants'
import type { UserProfile } from '../types'
import { initials } from '../utils/format'

interface ProfileModuleProps {
  user: UserProfile
  onUpdateProfile: (patch: Partial<UserProfile>) => Promise<void>
}

export function ProfileModule({ user, onUpdateProfile }: ProfileModuleProps) {
  const [image, setImage] = useState(user.image)
  const [position, setPosition] = useState(user.position)
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber)
  const [email, setEmail] = useState(user.email)

  useEffect(() => {
    setImage(user.image)
    setPosition(user.position)
    setPhoneNumber(user.phoneNumber)
    setEmail(user.email)
  }, [user])

  return (
    <section className="module-wrap">
      <h1>Настройки профиля</h1>

      <article className="details-screen">
        <div className="profile-summary">
          {image ? (
            <img className="avatar-photo" src={image} alt={user.fullName} />
          ) : (
            <div className="profile-avatar large">{initials(user.fullName)}</div>
          )}

          <div>
            <p>
              <strong>ФИО:</strong> {user.fullName}
            </p>
            <p>
              <strong>Роль:</strong> {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>

        <form
          className="inline-form compact"
          onSubmit={(event) => {
            event.preventDefault()
            void onUpdateProfile({
              image,
              position,
              phoneNumber,
              email,
            })
          }}
        >
          <div className="form-grid">
            <label>
              Должность
              <input
                className="text-input"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />
            </label>

            <label>
              Телефон
              <input
                className="text-input"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </label>

            <label>
              Email
              <input
                className="text-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              URL фотографии
              <input
                className="text-input"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          <button type="submit" className="primary-button button-sm">
            Сохранить профиль
          </button>
        </form>
      </article>
    </section>
  )
}
