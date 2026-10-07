import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade | Manu",
  description: "O que a Manu usa, o que não guarda e como apagar os seus dados.",
};

const secoes = [
  {
    titulo: "O que acontece com a sua voz",
    paragrafos: [
      "Durante a aula, o áudio do seu microfone é enviado pela internet para ser transformado em texto, para a Manu entender o que você disse e responder. Quando a aula termina, o microfone é desligado.",
      "Este site não grava o áudio, não guarda a transcrição e não mantém histórico das aulas em nenhum servidor. O registro de sessão do LiveKit está desligado no código do agente.",
    ],
  },
  {
    titulo: "Quem processa o áudio e o texto",
    paragrafos: [
      "Para a aula funcionar em tempo real, o áudio e o texto passam por empresas que prestam esse serviço: LiveKit (a chamada de voz), AssemblyAI (voz para texto), Google (o modelo que escreve as respostas) e xAI (texto para voz). Cada uma trata os dados segundo a própria política, e parte desse processamento pode acontecer fora do Brasil.",
    ],
  },
  {
    titulo: "O que fica guardado, e onde",
    paragrafos: [
      "Só três coisas: o primeiro nome, a etapa de estudo e uma frase sobre onde a aula parou. Elas ficam no armazenamento do navegador deste aparelho, não em um servidor, e são enviadas para a Manu no começo da aula seguinte para ela continuar de onde parou.",
      "Para apagar, use o link “Apagar o que a Manu lembra de mim” no rodapé da página inicial, ou limpe os dados do site no navegador.",
    ],
  },
  {
    titulo: "Crianças e adolescentes",
    paragrafos: [
      "Quem tem menos de 18 anos só deve usar a Manu com a autorização de um responsável, que precisa ler este aviso antes da primeira aula. A Manu não pede sobrenome, endereço, escola, telefone, foto nem rede social, e orienta a não informar esses dados.",
      "Se você é responsável e quer tirar uma dúvida ou pedir a remoção de algum dado, escreva para o endereço abaixo.",
    ],
  },
  {
    titulo: "Limites de uso",
    paragrafos: [
      "Para limitar abuso, o servidor usa o endereço IP para contar quantas aulas foram iniciadas na última hora. Essa contagem fica só na memória do servidor e some sozinha.",
    ],
  },
];

export default function Privacidade() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-12">
      <Link href="/" className="text-tinta inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
        Voltar para a Manu
      </Link>
      <article className="rounded-folha border-borda bg-folha shadow-folha mt-4 border px-5 py-8 sm:px-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Privacidade</h1>
        <p className="text-texto-2 mt-3 text-lg leading-relaxed">
          A Manu é um projeto de código aberto, sem cadastro e sem anúncios. Esta página explica, sem juridiquês, o
          que ela usa e o que não guarda.
        </p>
        {secoes.map((secao) => (
          <section key={secao.titulo} className="mt-8">
            <h2 className="text-xl font-bold">{secao.titulo}</h2>
            {secao.paragrafos.map((p) => (
              <p key={p} className="text-texto-2 mt-3 leading-relaxed">
                {p}
              </p>
            ))}
          </section>
        ))}
        <section className="mt-8">
          <h2 className="text-xl font-bold">Contato</h2>
          <p className="text-texto-2 mt-3 leading-relaxed">
            Responsável pelo projeto: Jean Oliveira. Dúvidas e pedidos pelo{" "}
            <a href="https://github.com/Jeanikt/tutor-ai-agent/issues" className="text-tinta font-semibold underline underline-offset-4">
              repositório no GitHub
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
