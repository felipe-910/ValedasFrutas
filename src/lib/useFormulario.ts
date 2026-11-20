import { useState } from 'react';

type Invalidos<T> = Partial<Record<keyof T, boolean>>;

// Estado de um formulário com validação: o erro de um campo aparece depois que a pessoa
// mexe nele (ou tenta enviar), igual ao comportamento das telas antigas.
export function useFormulario<T extends Record<string, string>>(
  inicial: T,
  validar: (valores: T) => Invalidos<T>
) {
  const [valores, setValores] = useState<T>(inicial);
  const [tocados, setTocados] = useState<Invalidos<T>>({});
  const invalidos = validar(valores);

  const alterar = (campo: keyof T, valor: string) => {
    setValores((anterior) => ({ ...anterior, [campo]: valor }));
    setTocados((anterior) => ({ ...anterior, [campo]: true }));
  };

  // true se o campo deve mostrar a mensagem de erro agora
  const erro = (campo: keyof T): boolean => !!tocados[campo] && !!invalidos[campo];

  // Marca todos os campos como "mexidos" e diz se está tudo certo para enviar
  const validarTudo = (): boolean => {
    const todos: Invalidos<T> = {};
    (Object.keys(inicial) as Array<keyof T>).forEach((c) => { todos[c] = true; });
    setTocados(todos);
    return Object.values(invalidos).every((v) => !v);
  };

  return { valores, setValores, alterar, erro, validarTudo };
}

export const emailValido = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
