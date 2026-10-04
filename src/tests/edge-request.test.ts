import { describe, it, expect } from 'vitest'
import {
  BadRequestError, readJsonObject, requireInteger, requireString, requireUuid,
} from '../../supabase/functions/_shared/request'

const post = (body: BodyInit | null) => new Request('http://localhost/fn', { method: 'POST', body })

describe('edge request helpers', () => {
  it('parses a JSON object body', async () => {
    expect(await readJsonObject(post('{"a":1}'))).toEqual({ a: 1 })
  })

  it('turns bad bodies into a 400-class error instead of an uncaught one', async () => {
    for (const body of ['not json', '', 'null', '[1,2]', '"text"', '42']) {
      await expect(readJsonObject(post(body))).rejects.toBeInstanceOf(BadRequestError)
    }
  })

  it('requireString rejects non-strings, blanks and over-long input', () => {
    expect(requireString('ok', 'f')).toBe('ok')
    for (const bad of [undefined, null, 5, {}, [], '', '   ']) expect(() => requireString(bad, 'f')).toThrow(BadRequestError)
    expect(() => requireString('x'.repeat(65), 'f', 64)).toThrow(/too long/)
  })

  it('requireUuid accepts ids and rejects filter-shaped or injected text', () => {
    expect(requireUuid('9503be33-a2ad-4372-be7d-0658696cf4df', 'id')).toBeTruthy()
    for (const bad of ['', 'x', 'x,code.eq.QR-NODE-37', "9503be33-a2ad-4372-be7d-0658696cf4df'; drop table teams;--", 7, null]) {
      expect(() => requireUuid(bad, 'id')).toThrow(BadRequestError)
    }
  })

  it('requireInteger enforces type and range', () => {
    expect(requireInteger(2, 'n', 1, 3)).toBe(2)
    for (const bad of [0, 4, 1.5, '2', null, NaN]) expect(() => requireInteger(bad, 'n', 1, 3)).toThrow(BadRequestError)
  })
})
