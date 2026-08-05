# Controle de cargas

Aplicação web pessoal para registro de cargas e repetições em exercícios de academia.

---

## Objetivo

Permitir que o usuário registre, consulte e acompanhe o histórico de séries realizadas na academia, com persistência local dos dados e sem necessidade de servidor ou conexão à internet.

---

## Funcionalidades

- Registrar exercício, carga (kg) e repetições.
- Data e horário salvos automaticamente no momento do registro.
- Consulta do histórico completo, do mais recente para o mais antigo.
- Filtro do histórico por nome de exercício (em tempo real).
- Exibição do último registro de um exercício ao digitá-lo no formulário.
- Sugestões automáticas de exercícios já cadastrados.
- Exclusão de registros com confirmação.
- Persistência dos dados no `localStorage` do navegador.
- Interface responsiva para celular e computador.

---

## Estrutura de pastas

```
controle-cargas/
├── index.html          → Estrutura semântica da página
├── css/
│   └── styles.css      → Estilos, variáveis, responsividade
├── js/
│   ├── app.js          → Lógica da aplicação, DOM e eventos
│   ├── storage.js      → Acesso ao localStorage (CRUD)
│   └── utils.js        → Funções auxiliares puras
├── assets/
│   └── icons/          → Pasta reservada para ícones futuros
└── README.md
```

---

## Tecnologias utilizadas

| Tecnologia   | Finalidade                              |
|--------------|-----------------------------------------|
| HTML5        | Estrutura semântica da página           |
| CSS3         | Estilos, variáveis e responsividade     |
| JavaScript   | Lógica, DOM e persistência              |
| localStorage | Armazenamento local dos registros       |

Sem dependências externas. Sem frameworks. Sem build.

---

## Como executar

### Método mais simples

1. Abra a pasta `controle-cargas/`.
2. Dê um duplo clique em `index.html`.
3. O arquivo abrirá diretamente no navegador padrão do sistema.

### Com servidor local (opcional)

Caso prefira evitar restrições de segurança do navegador ao abrir arquivos locais, use uma extensão de servidor local:

- **VS Code**: instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) e clique em **Open with Live Server**.
- **Python**: execute `python -m http.server` na pasta do projeto e acesse `http://localhost:8000`.
- **Node.js**: execute `npx serve .` na pasta do projeto.

> O uso de servidor local **não é obrigatório**. A aplicação funciona normalmente abrindo o `index.html` diretamente.

---

## Como os dados são armazenados

Todos os registros são salvos no `localStorage` do navegador sob a chave:

```
gymLoadRecords
```

O valor é um array JSON com objetos no seguinte formato:

```json
{
  "id": "1722884400000-abc1234",
  "exercise": "Supino reto",
  "weight": 22.5,
  "repetitions": 8,
  "createdAt": "2026-08-05T18:00:00.000Z"
}
```

Os dados **persistem** entre sessões e fechamentos do navegador, e estão **restritos ao domínio/arquivo** em que a aplicação é aberta.

---

## Como limpar os dados

### Pelo console do navegador

1. Abra o console (F12 → aba Console).
2. Execute:

```javascript
localStorage.removeItem('gymLoadRecords');
location.reload();
```

### Pelas configurações do navegador

Acesse as configurações de privacidade do seu navegador e limpe os dados do site.

> **Atenção:** a limpeza é irreversível. Não há backup automático.

---

## Limitações da versão atual

- Os dados ficam armazenados apenas no navegador e no dispositivo utilizado.
- Não há sincronização entre dispositivos ou navegadores diferentes.
- Não há backup automático — limpar o `localStorage` apaga todos os registros.
- Não há exportação ou importação de dados.
- Não há histórico visual (gráficos ou progressão).
- Não há autenticação — qualquer pessoa com acesso ao dispositivo pode ver e excluir os dados.

---

## Possíveis melhorias futuras

- Exportar registros para CSV ou JSON.
- Importar registros de um arquivo.
- Visualização gráfica da progressão de carga por exercício.
- Agrupamento por data ou sessão de treino.
- Fichas de treino com exercícios predefinidos.
- Cronômetro de descanso entre séries.
- Tema escuro (dark mode).
- Atalhos de teclado.
- Sincronização via conta pessoal (backend opcional).
- Instalação como PWA (Progressive Web App).
