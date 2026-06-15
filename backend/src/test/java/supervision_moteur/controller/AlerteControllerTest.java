package supervision_moteur.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import supervision_moteur.dto.AlertCreateRequest;
import supervision_moteur.entity.Alerte;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.StatutAlerte;
import supervision_moteur.repository.AlerteRepository;
import supervision_moteur.service.AlertService;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AlerteControllerTest {

    private AlerteRepository repository;
    private AlertService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(AlerteRepository.class);
        service = Mockito.mock(AlertService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new AlerteController(repository, service)).build();
    }

    @Test
    void listsActiveAlerts() throws Exception {
        Alerte alerte = alert(1L, StatutAlerte.OPEN);
        when(service.listActive()).thenReturn(List.of(alerte));

        mockMvc.perform(get("/api/alertes/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].statut", is("OPEN")));
    }

    @Test
    void createsAlert() throws Exception {
        when(service.create(any(AlertCreateRequest.class))).thenReturn(alert(2L, StatutAlerte.OPEN));

        mockMvc.perform(post("/api/alertes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"High vibration\",\"severity\":\"ELEVEE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(2)))
                .andExpect(jsonPath("$.gravite", is("ELEVEE")));
    }

    private Alerte alert(Long id, StatutAlerte status) {
        Alerte alerte = new Alerte();
        alerte.setId(id);
        alerte.setMessage("High vibration");
        alerte.setGravite(GraviteType.ELEVEE);
        alerte.setStatut(status);
        alerte.setDateCreation(LocalDateTime.now());
        return alerte;
    }
}
